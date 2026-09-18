import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Candle } from '../types/market';
import { detectBaseInterval } from './resampler';

export interface ColumnMapping {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  turnover?: string;
}

export interface ParseResult {
  success: boolean;
  candles: Candle[];
  detectedColumns: Partial<ColumnMapping>;
  availableColumns: string[];
  rawHeaders?: string[];
  sampleRows: Record<string, any>[];
  detectedInterval: string;
  error?: string;
  filename: string;
}

const TIMESTAMP_ALIASES = ['time', 'timestamp', 'datetime', 'date', 'open_time', 'opentime', '时间', '开盘时间', '日期', 'k线时间', 'ts'];
const OPEN_ALIASES = ['open', 'open_price', 'openprice', '开盘价', '开盘', '开', 'o', 'first'];
const HIGH_ALIASES = ['high', 'high_price', 'highprice', '最高价', '最高', '高', 'h', 'max'];
const LOW_ALIASES = ['low', 'low_price', 'lowprice', '最低价', '最低', '低', 'l', 'min'];
const CLOSE_ALIASES = ['close', 'close_price', 'closeprice', '收盘价', '收盘', '收', 'c', 'last'];
const VOLUME_ALIASES = ['volume', 'vol', '成交量', '交易量', '量', 'v', 'qty', 'amount_base'];
const TURNOVER_ALIASES = ['turnover', 'quote_volume', 'quotevolume', 'quote_asset_volume', '成交额', '交易额', '额', 'amount'];

export function autoDetectColumns(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-（）\(\)]/g, '');

  const findMatch = (aliases: string[]) => {
    return columns.find((col) => {
      const norm = normalize(col);
      return aliases.some((alias) => norm === normalize(alias) || norm.includes(normalize(alias)));
    });
  };

  mapping.timestamp = findMatch(TIMESTAMP_ALIASES);
  mapping.open = findMatch(OPEN_ALIASES);
  mapping.high = findMatch(HIGH_ALIASES);
  mapping.low = findMatch(LOW_ALIASES);
  mapping.close = findMatch(CLOSE_ALIASES);
  mapping.volume = findMatch(VOLUME_ALIASES);
  mapping.turnover = findMatch(TURNOVER_ALIASES);

  return mapping;
}

export function parseTimestampValue(val: any): number {
  if (val === null || val === undefined || val === '') return NaN;

  // Number timestamp (seconds or milliseconds)
  if (typeof val === 'number') {
    if (val < 3000000000) {
      // Unix timestamp in seconds
      return val * 1000;
    }
    // Unix timestamp in milliseconds
    return val;
  }

  // String timestamp
  const str = String(val).trim();
  const num = Number(str);
  if (!isNaN(num)) {
    if (num < 3000000000) {
      return num * 1000;
    }
    return num;
  }

  // Standard date parsing (e.g. 2024-01-01 12:00:00 or ISO)
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  return NaN;
}

export async function parseFileToCandles(
  file: File,
  customMapping?: Partial<ColumnMapping>
): Promise<ParseResult> {
  const filename = file.name;
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  try {
    let rows: Record<string, any>[] = [];

    if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
      const text = await file.text();
      const parseResult = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      rows = parseResult.data as Record<string, any>[];
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet);
    } else if (ext === 'json') {
      const text = await file.text();
      const parsedJson = JSON.parse(text);
      if (Array.isArray(parsedJson)) {
        rows = parsedJson;
      } else if (parsedJson.data && Array.isArray(parsedJson.data)) {
        rows = parsedJson.data;
      } else if (parsedJson.candles && Array.isArray(parsedJson.candles)) {
        rows = parsedJson.candles;
      } else {
        throw new Error('JSON文件中未找到数组形式的行情数据');
      }
    } else {
      throw new Error(`暂不支持的文件格式: .${ext}，请上传 CSV、Excel (xlsx/xls) 或 JSON 文件`);
    }

    if (!rows || rows.length === 0) {
      throw new Error('文件中没有解析出任何有效数据行');
    }

    const availableColumns = Object.keys(rows[0] || {});
    const mapping = { ...autoDetectColumns(availableColumns), ...customMapping };

    // Validate required fields
    if (!mapping.open || !mapping.high || !mapping.low || !mapping.close) {
      return {
        success: false,
        candles: [],
        detectedColumns: mapping,
        availableColumns,
        sampleRows: rows.slice(0, 5),
        detectedInterval: '未知',
        error: `未完全匹配到 OHLC 关键字段 (识别到: 开盘=${mapping.open || '未找到'}, 最高=${mapping.high || '未找到'}, 最低=${mapping.low || '未找到'}, 收盘=${mapping.close || '未找到'})`,
        filename,
      };
    }

    const candles: Candle[] = [];
    const now = Date.now();
    const fallbackInterval = 15 * 60 * 1000;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const open = parseFloat(r[mapping.open!]);
      const high = parseFloat(r[mapping.high!]);
      const low = parseFloat(r[mapping.low!]);
      const close = parseFloat(r[mapping.close!]);

      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
        continue;
      }

      let timestamp = mapping.timestamp ? parseTimestampValue(r[mapping.timestamp]) : NaN;
      if (isNaN(timestamp)) {
        // Fallback simulated sequential timestamp
        timestamp = now - (rows.length - i) * fallbackInterval;
      }

      const volume = mapping.volume ? parseFloat(r[mapping.volume]) || 0 : 0;
      const turnover = mapping.turnover ? parseFloat(r[mapping.turnover]) : (volume * ((open + close) / 2));

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: Number(volume.toFixed(4)),
        turnover: Number(turnover.toFixed(2)),
        isClosed: true,
      });
    }

    if (candles.length === 0) {
      throw new Error('未能从表格中提取出有效的行情K线');
    }

    // Sort ascending by timestamp
    candles.sort((a, b) => a.timestamp - b.timestamp);

    const detected = detectBaseInterval(candles);

    return {
      success: true,
      candles,
      detectedColumns: mapping,
      availableColumns,
      rawHeaders: availableColumns,
      sampleRows: rows.slice(0, 5),
      detectedInterval: detected.label,
      filename,
    };
  } catch (err: any) {
    return {
      success: false,
      candles: [],
      detectedColumns: {},
      availableColumns: [],
      sampleRows: [],
      detectedInterval: '错误',
      error: err.message || '文件解析失败',
      filename,
    };
  }
}

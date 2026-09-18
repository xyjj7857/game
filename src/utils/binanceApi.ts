import { Candle, CooldownStatus } from '../types/market';
import { normalizeBinanceSymbol, loadLiveBinanceFuturesSymbols } from './binanceSymbols';

export { normalizeBinanceSymbol, loadLiveBinanceFuturesSymbols };

export interface BinanceFetchOptions {
  symbol: string;
  interval: string;
  limit?: number;
  fetchAll?: boolean;
  startTime?: number;
  endTime?: number;
  marketType?: 'futures' | 'spot';
  onProgress?: (fetched: number, total: number, statusText: string) => void;
  shouldCancel?: () => boolean;
}

class BinanceCooldownManager {
  private lastRequestTime: number = 0;
  private minIntervalMs: number = 500; // minimum ms between consecutive requests
  private requestTimestamps: number[] = [];
  private maxRequestsPerMinute: number = 80;
  private currentWeightUsed: number = 0;
  private maxWeightPerMinute: number = 1200;
  private listeners: ((status: CooldownStatus) => void)[] = [];

  constructor() {
    // Periodically clean up old timestamps & weights
    setInterval(() => {
      this.cleanup();
      this.notifyListeners();
    }, 1000);
  }

  public subscribe(listener: (status: CooldownStatus) => void) {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private cleanup() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);
    this.currentWeightUsed = this.requestTimestamps.length * 5; // approx 5 weight per klines query
  }

  public getStatus(): CooldownStatus {
    this.cleanup();
    const now = Date.now();
    const elapsedSinceLast = now - this.lastRequestTime;
    const cooldownRemainingSeconds = Math.max(0, Number(((this.minIntervalMs - elapsedSinceLast) / 1000).toFixed(1)));
    const isThrottled = this.requestTimestamps.length >= this.maxRequestsPerMinute || this.currentWeightUsed >= this.maxWeightPerMinute;

    return {
      lastRequestTime: this.lastRequestTime,
      requestCountLastMinute: this.requestTimestamps.length,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      cooldownRemainingSeconds: cooldownRemainingSeconds > 0 ? cooldownRemainingSeconds : 0,
      isThrottled,
      rateLimitWeightUsed: this.currentWeightUsed,
      maxWeight: this.maxWeightPerMinute,
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public async acquireSlot(weight: number = 5): Promise<void> {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;

    // 1. Minimum interval cooldown
    if (timeSinceLast < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLast;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // 2. High-frequency limit check
    this.cleanup();
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitTime = Math.max(1000, 60000 - (Date.now() - oldest) + 200);
      console.warn(`[Binance Cooldown] Approaching rate limit. Waiting ${waitTime}ms to prevent 429...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestTimestamps.push(this.lastRequestTime);
    this.currentWeightUsed += weight;
    this.notifyListeners();
  }
}

export const binanceCooldown = new BinanceCooldownManager();

// Local cache to avoid re-requesting the same snapshot
const klineCache = new Map<string, { data: Candle[]; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds cache

const ENDPOINTS = {
  futures: [
    'https://fapi.binance.com/fapi/v1/klines',
    'https://fapi.binance.vision/fapi/v1/klines',
  ],
  spot: [
    'https://api.binance.com/api/v3/klines',
    'https://data-api.binance.vision/api/v3/klines',
  ],
};

/**
 * Fetch raw Binance Klines with safe rate-limit cooldown
 */
export async function fetchBinanceKlines(options: BinanceFetchOptions): Promise<Candle[]> {
  const { symbol, interval, limit = 500, fetchAll = false, startTime, endTime, marketType = 'futures', onProgress } = options;
  const formattedSymbol = normalizeBinanceSymbol(symbol, marketType);

  if (fetchAll) {
    return await fetchAllBinanceKlines(options);
  }

  const cacheKey = `${marketType}_${formattedSymbol}_${interval}_${limit}_${startTime || 0}_${endTime || 0}`;
  const cached = klineCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (onProgress) onProgress(cached.data.length, cached.data.length, '从本地缓存即时加载');
    return cached.data;
  }

  const endpointList = ENDPOINTS[marketType] || ENDPOINTS.futures;

  // If requesting more than 1000 bars, paginate in chunks of 1000
  if (limit > 1000) {
    return await fetchPaginatedKlines(options, endpointList, formattedSymbol);
  }

  await binanceCooldown.acquireSlot(5);
  if (onProgress) onProgress(0, limit, `正在连接币安行情服务器获取 ${formattedSymbol}...`);

  const params = new URLSearchParams({
    symbol: formattedSymbol,
    interval,
    limit: String(Math.min(limit, 1000)),
  });

  if (startTime) params.append('startTime', String(startTime));
  if (endTime) params.append('endTime', String(endTime));

  let lastError: Error | null = null;

  for (const baseUrl of endpointList) {
    try {
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(errorText);
        } catch (_) {}

        if (parsedJson?.code === -1121 || errorText.includes('Invalid symbol')) {
          throw new Error(
            `币安交易对不存在: "${formattedSymbol}"。提示：币安合约交易对通常为 BTCUSDT、ETHUSDT、SOLUSDT 等标准格式。`
          );
        }

        if (response.status === 429) {
          throw new Error('币安API访问频率超限 (HTTP 429)，已触发冷却保护，请等待1分钟后再试');
        }
        if (response.status === 418) {
          throw new Error('IP已被币安临时限制 (HTTP 418)，请稍后重试');
        }

        throw new Error(`币安API响应异常 (${response.status}): ${parsedJson?.msg || errorText}`);
      }

      const rawData = await response.json();
      if (!Array.isArray(rawData)) {
        throw new Error('返回的行情数据格式不符合预期');
      }

      const parsedCandles: Candle[] = rawData.map((item: any[]) => ({
        timestamp: Number(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        turnover: parseFloat(item[7]), // Quote asset volume in USDT
        tradesCount: parseInt(item[8], 10),
        isClosed: true,
      }));

      klineCache.set(cacheKey, { data: parsedCandles, timestamp: Date.now() });
      if (onProgress) onProgress(parsedCandles.length, parsedCandles.length, '数据加载完成');
      return parsedCandles;
    } catch (err: any) {
      lastError = err;
      // If it is a symbol error (-1121), fail fast without trying other endpoints
      if (err.message?.includes('币安交易对不存在')) {
        throw err;
      }
      console.warn(`[Binance API] Failed on ${baseUrl}, trying backup endpoint...`, err);
    }
  }

  throw lastError || new Error('无法连接到币安行情服务器，请检查网络连接');
}

/**
 * Fetch ALL historical Binance Klines seamlessly from listing inception to present
 * with rigorous anti-ban cooldown intervals
 */
export async function fetchAllBinanceKlines(options: BinanceFetchOptions): Promise<Candle[]> {
  const { symbol, interval = '15m', marketType = 'futures', onProgress, shouldCancel } = options;
  const formattedSymbol = normalizeBinanceSymbol(symbol, marketType);
  const endpointList = ENDPOINTS[marketType] || ENDPOINTS.futures;
  const baseUrl = endpointList[0];

  const allCandles: Candle[] = [];
  const chunkSize = 1000;
  let currentEndTime = options.endTime || Date.now();
  let batchCount = 0;
  let hasMore = true;
  let prevOldestTimestamp = 0;

  if (onProgress) {
    onProgress(0, 0, `正在初始化 ${formattedSymbol} 全量 ${interval} 历史行情安全同步链路...`);
  }

  while (hasMore) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('用户已取消行情同步');
    }

    batchCount++;
    // Safe slot acquisition to avoid rate-limit bans (429/418)
    await binanceCooldown.acquireSlot(5);

    const params = new URLSearchParams({
      symbol: formattedSymbol,
      interval,
      limit: String(chunkSize),
      endTime: String(currentEndTime),
    });

    let response: Response;
    try {
      response = await fetch(`${baseUrl}?${params.toString()}`);
    } catch (netErr: any) {
      // Retry once on network glitch
      await new Promise((r) => setTimeout(r, 1000));
      response = await fetch(`${baseUrl}?${params.toString()}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(errorText);
      } catch (_) {}

      if (parsedJson?.code === -1121 || errorText.includes('Invalid symbol')) {
        throw new Error(`币安交易对不存在: "${formattedSymbol}"`);
      }

      if (response.status === 429 || response.status === 418) {
        // Wait 3 seconds and retry safely
        console.warn('[Binance API] Rate limit warning, cooling down for 3s...');
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (allCandles.length > 0) {
        console.warn('Sync stopped early with error, returning collected candles:', errorText);
        break;
      }
      throw new Error(`行情同步失败 (${response.status}): ${parsedJson?.msg || errorText}`);
    }

    const rawData: any[] = await response.json();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      // No earlier data exists, reached the launch/listing time!
      break;
    }

    const chunkCandles: Candle[] = rawData.map((item: any[]) => ({
      timestamp: Number(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      turnover: parseFloat(item[7]),
      tradesCount: parseInt(item[8], 10),
      isClosed: true,
    }));

    // Prepend older candles
    allCandles.unshift(...chunkCandles);

    const oldestInChunk = chunkCandles[0].timestamp;
    if (oldestInChunk === prevOldestTimestamp) {
      // Loop protection
      break;
    }
    prevOldestTimestamp = oldestInChunk;
    currentEndTime = oldestInChunk - 1;

    const startDateObj = new Date(oldestInChunk);
    const startDateStr = `${startDateObj.getFullYear()}/${String(startDateObj.getMonth() + 1).padStart(2, '0')}/${String(startDateObj.getDate()).padStart(2, '0')}`;

    if (onProgress) {
      onProgress(
        allCandles.length,
        0,
        `正在安全同步全量行情：已拉取 ${allCandles.length.toLocaleString()} 根 ${interval} K线 (追溯至 ${startDateStr})... 智能防限流冷却中`
      );
    }

    // If less than full chunk returned, we reached the genesis candle of the contract
    if (chunkCandles.length < chunkSize) {
      hasMore = false;
      break;
    }

    // Protective delay between batches to ensure connection health
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  // Deduplicate and sort ascending by timestamp
  const map = new Map<number, Candle>();
  allCandles.forEach((c) => map.set(c.timestamp, c));
  const sortedResult = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

  if (onProgress) {
    onProgress(sortedResult.length, sortedResult.length, `全量行情同步完成！共获得 ${sortedResult.length.toLocaleString()} 根完整历史K线`);
  }

  return sortedResult;
}

/**
 * Multi-batch historical fetcher with smart interval cooldown
 */
async function fetchPaginatedKlines(
  options: BinanceFetchOptions,
  endpointList: string[],
  formattedSymbol: string
): Promise<Candle[]> {
  const { interval, limit = 1500, onProgress } = options;
  const allCandles: Candle[] = [];
  const chunkSize = 1000;
  let remaining = limit;
  let currentEndTime = options.endTime || Date.now();
  const baseUrl = endpointList[0];

  while (remaining > 0) {
    const currentLimit = Math.min(remaining, chunkSize);
    await binanceCooldown.acquireSlot(5);

    if (onProgress) {
      onProgress(
        allCandles.length,
        limit,
        `正在分批获取历史行情 (${allCandles.length}/${limit} 根)，执行限流冷却保护...`
      );
    }

    const params = new URLSearchParams({
      symbol: formattedSymbol,
      interval,
      limit: String(currentLimit),
      endTime: String(currentEndTime),
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(errorText);
      } catch (_) {}

      if (parsedJson?.code === -1121 || errorText.includes('Invalid symbol')) {
        throw new Error(
          `币安交易对不存在: "${formattedSymbol}"。提示：币安合约交易对通常为 BTCUSDT、ETHUSDT 等标准格式。`
        );
      }

      if (allCandles.length > 0) {
        console.warn('Partial fetch succeeded before error, returning collected data');
        break;
      }
      throw new Error(`分批获取失败: ${parsedJson?.msg || response.statusText}`);
    }

    const rawData: any[] = await response.json();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      break;
    }

    const chunkCandles: Candle[] = rawData.map((item: any[]) => ({
      timestamp: Number(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      turnover: parseFloat(item[7]),
      tradesCount: parseInt(item[8], 10),
      isClosed: true,
    }));

    // Prepend older candles
    allCandles.unshift(...chunkCandles);
    remaining -= chunkCandles.length;

    // Next chunk ends before the oldest candle timestamp
    currentEndTime = chunkCandles[0].timestamp - 1;

    if (chunkCandles.length < currentLimit) {
      // Reached earliest available data
      break;
    }
  }

  // Deduplicate and sort
  const map = new Map<number, Candle>();
  allCandles.forEach((c) => map.set(c.timestamp, c));
  const result = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

  if (onProgress) onProgress(result.length, result.length, `成功加载 ${result.length} 根完整历史K线`);
  return result;
}

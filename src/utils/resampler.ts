import { Candle, TimeframeInterval } from '../types/market';

export const INTERVAL_MS_MAP: Record<string, number> = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

export const INTERVAL_LABELS: Record<string, string> = {
  '1m': '1分钟 (1M)',
  '3m': '3分钟 (3M)',
  '5m': '5分钟 (5M)',
  '15m': '15分钟 (15M)',
  '30m': '30分钟 (30M)',
  '1h': '1小时 (1H)',
  '2h': '2小时 (2H)',
  '4h': '4小时 (4H)',
  '6h': '6小时 (6H)',
  '8h': '8小时 (8H)',
  '12h': '12小时 (12H)',
  '1d': '日线 (1D)',
  '1w': '周线 (1W)',
  'raw': '原始周期',
};

/**
 * Detect the estimated base timeframe of raw candlestick data in ms and interval label
 */
export function detectBaseInterval(candles: Candle[]): { intervalMs: number; label: string } {
  if (!candles || candles.length < 2) {
    return { intervalMs: 15 * 60 * 1000, label: '15m' };
  }

  // Calculate differences between timestamps
  const diffs: number[] = [];
  const sampleCount = Math.min(candles.length - 1, 50);
  for (let i = 0; i < sampleCount; i++) {
    const diff = candles[i + 1].timestamp - candles[i].timestamp;
    if (diff > 0) {
      diffs.push(diff);
    }
  }

  if (diffs.length === 0) {
    return { intervalMs: 15 * 60 * 1000, label: '15m' };
  }

  // Find median diff
  diffs.sort((a, b) => a - b);
  const medianDiff = diffs[Math.floor(diffs.length / 2)];

  // Match closest known interval
  let closestKey = '15m';
  let minDiffDelta = Infinity;

  for (const [key, ms] of Object.entries(INTERVAL_MS_MAP)) {
    const delta = Math.abs(ms - medianDiff);
    if (delta < minDiffDelta) {
      minDiffDelta = delta;
      closestKey = key;
    }
  }

  return {
    intervalMs: INTERVAL_MS_MAP[closestKey] || medianDiff,
    label: closestKey,
  };
}

export interface ResampleOptions {
  timezoneOffsetHours?: number;
  maxTimestamp?: number; // Strictly filter out any raw data with timestamp > maxTimestamp (Anti-leakage)
  includeIncompleteBar?: boolean; // When true, current partially-elapsed bar is included with isClosed = false
}

/**
 * Aggregate smaller timeframe candles to higher timeframe (e.g. 15m -> 4h, 1h -> 1d)
 * Supports real-time anti-leakage replay cutoff via maxTimestamp.
 */
export function aggregateCandles(
  rawCandles: Candle[],
  targetInterval: TimeframeInterval,
  optionsOrTzOffset: number | ResampleOptions = 0
): Candle[] {
  if (!rawCandles || rawCandles.length === 0) return [];

  let timezoneOffsetHours = 0;
  let maxTimestamp: number | undefined = undefined;
  let includeIncompleteBar: boolean = true;

  if (typeof optionsOrTzOffset === 'number') {
    timezoneOffsetHours = optionsOrTzOffset;
  } else if (optionsOrTzOffset) {
    timezoneOffsetHours = optionsOrTzOffset.timezoneOffsetHours ?? 0;
    maxTimestamp = optionsOrTzOffset.maxTimestamp;
    includeIncompleteBar = optionsOrTzOffset.includeIncompleteBar ?? true;
  }

  // Ensure chronological order
  const sorted = [...rawCandles].sort((a, b) => a.timestamp - b.timestamp);

  // If maxTimestamp is given, strictly filter out all raw future candles to prevent lookahead bias!
  let available = sorted;
  if (maxTimestamp !== undefined && maxTimestamp > 0) {
    available = sorted.filter((c) => c.timestamp <= maxTimestamp);
  }
  if (available.length === 0) return [];

  if (targetInterval === 'raw') {
    return available;
  }

  const targetMs = INTERVAL_MS_MAP[targetInterval];
  if (!targetMs) return available;

  const detected = detectBaseInterval(rawCandles);
  // If target timeframe is smaller than base timeframe, resampling down is not recommended without interpolation
  if (targetMs < detected.intervalMs * 0.9) {
    console.warn(`Target timeframe (${targetInterval}) is smaller than source base timeframe (${detected.label}). Returning available raw.`);
    return available;
  }

  const buckets = new Map<number, Candle[]>();
  const tzOffsetMs = timezoneOffsetHours * 3600 * 1000;

  for (const candle of available) {
    // Offset for proper daily/session alignment if needed
    const adjustedTime = candle.timestamp + tzOffsetMs;
    const bucketTime = Math.floor(adjustedTime / targetMs) * targetMs - tzOffsetMs;

    let group = buckets.get(bucketTime);
    if (!group) {
      group = [];
      buckets.set(bucketTime, group);
    }
    group.push(candle);
  }

  const aggregated: Candle[] = [];

  for (const [bucketTimestamp, group] of buckets.entries()) {
    if (group.length === 0) continue;

    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    let turnover = 0;
    let tradesCount = 0;

    for (const c of group) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      volume += c.volume || 0;
      turnover += c.turnover || (c.volume * ((c.open + c.close) / 2));
      tradesCount += c.tradesCount || 0;
    }

    const open = group[0].open;
    const close = group[group.length - 1].close;

    // A candle is fully closed if simulation time has reached or passed the end of its duration window
    const barEndTimestamp = bucketTimestamp + targetMs - 1;
    const isClosed = maxTimestamp === undefined || maxTimestamp >= barEndTimestamp;

    // If caller requested ONLY fully closed candles and this bar has not finished yet, omit it
    if (!isClosed && !includeIncompleteBar) {
      continue;
    }

    let progressText: string | undefined = undefined;
    let progressPct: number | undefined = undefined;
    if (!isClosed && maxTimestamp !== undefined) {
      const elapsedMs = Math.max(0, maxTimestamp - bucketTimestamp + 1);
      progressPct = Math.min(100, Math.round((elapsedMs / targetMs) * 100));
      const hoursElapsed = (elapsedMs / 3600000).toFixed(1).replace(/\.0$/, '');
      const totalHours = (targetMs / 3600000).toFixed(0);
      progressText = `${hoursElapsed}/${totalHours}H`;
    }

    aggregated.push({
      timestamp: bucketTimestamp,
      open,
      high,
      low,
      close,
      volume: Number(volume.toFixed(4)),
      turnover: Number(turnover.toFixed(2)),
      tradesCount,
      isClosed,
      progressText,
      progressPct,
    });
  }

  return aggregated.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Finds the highest candle index whose timestamp is less than or equal to targetTimestamp.
 * This ensures multi-timeframe switching is synchronized by physical elapsed time,
 * completely eliminating future data leakage (lookahead bias).
 */
export function findCandleIndexByTimestamp(
  candles: { timestamp: number }[],
  targetTimestamp: number
): number {
  if (!candles || candles.length === 0) return 0;
  if (targetTimestamp <= candles[0].timestamp) return 0;
  
  let low = 0;
  let high = candles.length - 1;
  let bestIndex = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (candles[mid].timestamp <= targetTimestamp) {
      bestIndex = mid;
      low = mid + 1; // Try to find a later candle that is still <= targetTimestamp
    } else {
      high = mid - 1;
    }
  }

  return bestIndex;
}

/**
 * Returns the duration in milliseconds represented by one candle bar in the given timeframe
 */
export function getIntervalDurationMs(
  interval: TimeframeInterval,
  candles?: Candle[]
): number {
  if (interval !== 'raw' && INTERVAL_MS_MAP[interval]) {
    return INTERVAL_MS_MAP[interval];
  }
  if (candles && candles.length >= 2) {
    const diff = candles[1].timestamp - candles[0].timestamp;
    if (diff > 0) return diff;
  }
  return 15 * 60 * 1000;
}


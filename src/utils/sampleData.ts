import { Candle } from '../types/market';

/**
 * Generates realistic 15-minute BTC/USDT candlestick data starting around price ~90,000 to match current market levels
 */
export function generateSampleBTC15m(): Candle[] {
  const candles: Candle[] = [];
  const count = 480; // 5 days of 15m bars
  const intervalMs = 15 * 60 * 1000;
  const startTime = Date.now() - count * intervalMs;

  let currentPrice = 88500;
  const trendPhases = [
    { bars: 80, drift: 0.0004, vol: 0.003 },  // Accumulation upward
    { bars: 60, drift: -0.0003, vol: 0.0025 }, // Pullback
    { bars: 100, drift: 0.0008, vol: 0.0045 }, // Strong breakout rally (matching screenshot look)
    { bars: 70, drift: -0.0006, vol: 0.0038 }, // Correction
    { bars: 90, drift: 0.0005, vol: 0.0032 },  // Consolidation upward
    { bars: 80, drift: -0.0002, vol: 0.004 },  // High volatility range
  ];

  let phaseIdx = 0;
  let phaseBarCount = 0;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * intervalMs;
    const phase = trendPhases[phaseIdx] || trendPhases[0];

    // Price change with drift and volatility
    const randomShock = (Math.random() - 0.49) * 2;
    const returnRate = phase.drift + randomShock * phase.vol;
    const open = currentPrice;
    const close = Number((open * (1 + returnRate)).toFixed(2));

    const wickUpper = Math.random() * 0.003 * Math.max(open, close);
    const wickLower = Math.random() * 0.003 * Math.min(open, close);

    const high = Number((Math.max(open, close) + wickUpper).toFixed(2));
    const low = Number((Math.min(open, close) - wickLower).toFixed(2));

    const baseVol = 250 + Math.random() * 400;
    const isSpike = Math.random() > 0.93;
    const volume = Number((isSpike ? baseVol * (2.5 + Math.random() * 3) : baseVol).toFixed(4));
    const turnover = Number((volume * ((open + close) / 2)).toFixed(2));

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      turnover,
      tradesCount: Math.floor(volume * 15),
      isClosed: true,
    });

    currentPrice = close;
    phaseBarCount++;
    if (phaseBarCount >= phase.bars && phaseIdx < trendPhases.length - 1) {
      phaseIdx++;
      phaseBarCount = 0;
    }
  }

  return candles;
}

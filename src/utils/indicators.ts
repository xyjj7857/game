import { Candle, CalculatedCandle, FeatureKEvent, CustomFeatureKConfig } from '../types/market';

export function calculateIndicators(candles: Candle[]): CalculatedCandle[] {
  if (!candles || candles.length === 0) return [];

  const result: CalculatedCandle[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    closes.push(c.close);
    volumes.push(c.volume);

    // Calculate MA7
    let ma7: number | undefined = undefined;
    if (i >= 6) {
      const sum7 = closes.slice(i - 6, i + 1).reduce((a, b) => a + b, 0);
      ma7 = sum7 / 7;
    }

    // Calculate MA25
    let ma25: number | undefined = undefined;
    if (i >= 24) {
      const sum25 = closes.slice(i - 24, i + 1).reduce((a, b) => a + b, 0);
      ma25 = sum25 / 25;
    }

    // Calculate MA99
    let ma99: number | undefined = undefined;
    if (i >= 98) {
      const sum99 = closes.slice(i - 98, i + 1).reduce((a, b) => a + b, 0);
      ma99 = sum99 / 99;
    }

    // Calculate Volume MA (e.g. 20 period)
    let volumeMa: number | undefined = undefined;
    if (i >= 19) {
      const sumVol = volumes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
      volumeMa = sumVol / 20;
    }

    const prevClose = i > 0 ? candles[i - 1].close : c.open;
    const changePct = prevClose > 0 ? ((c.close - prevClose) / prevClose) * 100 : 0;
    const amplitudePct = c.low > 0 ? ((c.high - c.low) / c.low) * 100 : 0;

    result.push({
      ...c,
      index: i,
      ma7,
      ma25,
      ma99,
      volumeMa,
      changePct: Number(changePct.toFixed(2)),
      amplitudePct: Number(amplitudePct.toFixed(2)),
    });
  }

  return result;
}

/**
 * Detect significant candlestick patterns and market events (Feature K-lines)
 */
export function detectFeatureKEvents(candles: CalculatedCandle[]): FeatureKEvent[] {
  const events: FeatureKEvent[] = [];
  if (candles.length < 10) return events;

  // Calculate average volume
  const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const bodySize = Math.abs(curr.close - curr.open);
    const totalRange = curr.high - curr.low;
    const volRatio = avgVolume > 0 ? curr.volume / avgVolume : 1;

    // 1. Big Bullish Surge (> 2.5% increase)
    if (curr.changePct >= 2.5 && curr.close > curr.open) {
      events.push({
        index: i,
        timestamp: curr.timestamp,
        type: 'BULLISH_SURGE',
        name: '强劲大阳线',
        description: `涨幅 +${curr.changePct.toFixed(2)}%，量能 ${volRatio.toFixed(1)}x`,
        changePct: curr.changePct,
        volumeRatio: Number(volRatio.toFixed(1)),
        price: curr.close,
        category: 'smart',
        amplitudePct: curr.amplitudePct,
      });
      continue;
    }

    // 2. Big Bearish Plunge (< -2.5% decrease)
    if (curr.changePct <= -2.5 && curr.close < curr.open) {
      events.push({
        index: i,
        timestamp: curr.timestamp,
        type: 'BEARISH_PLUNGE',
        name: '放量大阴线',
        description: `跌幅 ${curr.changePct.toFixed(2)}%，量能 ${volRatio.toFixed(1)}x`,
        changePct: curr.changePct,
        volumeRatio: Number(volRatio.toFixed(1)),
        price: curr.close,
        category: 'smart',
        amplitudePct: curr.amplitudePct,
      });
      continue;
    }

    // 3. Extreme Volume Spike (> 2.8x average volume)
    if (volRatio >= 2.8) {
      events.push({
        index: i,
        timestamp: curr.timestamp,
        type: 'HIGH_VOLUME',
        name: '天量异动K',
        description: `成交量达均量 ${volRatio.toFixed(1)}倍，振幅 ${curr.amplitudePct.toFixed(2)}%`,
        changePct: curr.changePct,
        volumeRatio: Number(volRatio.toFixed(1)),
        price: curr.close,
        category: 'smart',
        amplitudePct: curr.amplitudePct,
      });
      continue;
    }

    // 4. Pin Bar / Hammer (Long lower or upper shadow)
    if (totalRange > 0 && bodySize / totalRange < 0.25) {
      const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
      const upperShadow = curr.high - Math.max(curr.open, curr.close);

      if (lowerShadow / totalRange > 0.6) {
        events.push({
          index: i,
          timestamp: curr.timestamp,
          type: 'PIN_BAR',
          name: '长下影探底针',
          description: `探底回升，下影线占比 ${Math.round((lowerShadow / totalRange) * 100)}%`,
          changePct: curr.changePct,
          volumeRatio: Number(volRatio.toFixed(1)),
          price: curr.close,
          category: 'smart',
          amplitudePct: curr.amplitudePct,
        });
      } else if (upperShadow / totalRange > 0.6) {
        events.push({
          index: i,
          timestamp: curr.timestamp,
          type: 'PIN_BAR',
          name: '长上影冲高回落',
          description: `冲高受阻，上影线占比 ${Math.round((upperShadow / totalRange) * 100)}%`,
          changePct: curr.changePct,
          volumeRatio: Number(volRatio.toFixed(1)),
          price: curr.close,
          category: 'smart',
          amplitudePct: curr.amplitudePct,
        });
      }
    }

    // 5. MA7 / MA25 Golden Cross or Death Cross
    if (curr.ma7 && curr.ma25 && prev.ma7 && prev.ma25) {
      if (prev.ma7 <= prev.ma25 && curr.ma7 > curr.ma25) {
        events.push({
          index: i,
          timestamp: curr.timestamp,
          type: 'MA_GOLDEN_CROSS',
          name: 'MA7金叉MA25',
          description: `均线系统多头排列金叉，收盘价: ${curr.close}`,
          changePct: curr.changePct,
          volumeRatio: Number(volRatio.toFixed(1)),
          price: curr.close,
          category: 'smart',
          amplitudePct: curr.amplitudePct,
        });
      } else if (prev.ma7 >= prev.ma25 && curr.ma7 < curr.ma25) {
        events.push({
          index: i,
          timestamp: curr.timestamp,
          type: 'MA_DEATH_CROSS',
          name: 'MA7死叉MA25',
          description: `均线系统空头排列死叉，收盘价: ${curr.close}`,
          changePct: curr.changePct,
          volumeRatio: Number(volRatio.toFixed(1)),
          price: curr.close,
          category: 'smart',
          amplitudePct: curr.amplitudePct,
        });
      }
    }
  }

  return events;
}

/**
 * Helper to extract candle turnover (quote asset volume in USDT)
 */
export function getCandleTurnover(c: CalculatedCandle | Candle): number {
  if (c.turnover !== undefined && c.turnover > 0) return c.turnover;
  return c.volume * ((c.open + c.close) / 2 || c.close || 1);
}

export function formatTurnoverShort(val: number): string {
  if (val >= 100000000) {
    return `${(val / 100000000).toFixed(2)}亿 U`;
  }
  if (val >= 10000) {
    return `${(val / 10000).toFixed(1)}万 U`;
  }
  return `${val.toFixed(1)} U`;
}

/**
 * Detect user-customized feature K-lines (Gain, Drop, Amplitude, VolSurge1, VolSurge2) in current active timeframe
 */
export function detectCustomFeatureKEvents(
  candles: CalculatedCandle[],
  config: CustomFeatureKConfig
): FeatureKEvent[] {
  const events: FeatureKEvent[] = [];
  if (!candles || candles.length === 0) return events;

  const {
    minTurnover,
    enableGain,
    gainThreshold,
    enableDrop,
    dropThreshold,
    enableAmplitude,
    amplitudeThreshold,
    enableVolSurge1,
    volSurge1Ratio,
    enableVolSurge2,
    volSurge2Lookback,
    volSurge2Ratio,
  } = config;

  if (
    !enableGain &&
    !enableDrop &&
    !enableAmplitude &&
    !enableVolSurge1 &&
    !enableVolSurge2
  ) {
    return events;
  }

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const currTurnover = getCandleTurnover(c);
    
    // 全局成交额过滤：必须大于设定的最小成交额才进入特征筛选
    if (minTurnover > 0 && currTurnover < minTurnover) {
      continue;
    }

    const tags: string[] = [];

    // 1. Check Gain (涨幅 >= threshold, positive)
    const isGainHit = Boolean(enableGain && gainThreshold > 0 && c.changePct >= gainThreshold);
    if (isGainHit) {
      tags.push(`涨幅 +${c.changePct.toFixed(2)}%`);
    }

    // 2. Check Drop (跌幅 >= threshold, dropThreshold is positive like 2.0%, changePct <= -2.0%)
    const absDrop = Math.abs(dropThreshold);
    const isDropHit = Boolean(enableDrop && absDrop > 0 && c.changePct <= -absDrop);
    if (isDropHit) {
      tags.push(`跌幅 ${c.changePct.toFixed(2)}%`);
    }

    // 3. Check Amplitude (振幅 >= threshold)
    const isAmpHit = Boolean(enableAmplitude && amplitudeThreshold > 0 && c.amplitudePct >= amplitudeThreshold);
    if (isAmpHit) {
      tags.push(`振幅 ${c.amplitudePct.toFixed(2)}%`);
    }

    // 4. Check 放量1: 最新的这一根k线的成交额是上一根k线的成交额的 a 倍 (a 自定义，勾选生效)
    let isVolSurge1Hit = false;
    let ratio1 = 0;
    if (enableVolSurge1 && volSurge1Ratio > 0 && i > 0) {
      const prevTurnover = getCandleTurnover(candles[i - 1]);
      if (prevTurnover > 0 && currTurnover > 0) {
        ratio1 = currTurnover / prevTurnover;
        if (ratio1 >= volSurge1Ratio) {
          isVolSurge1Hit = true;
          tags.push(`放量1: 上根${ratio1.toFixed(1)}倍 (≥${volSurge1Ratio}x)`);
        }
      }
    }

    // 5. Check 放量2: 最新的这一根k线的成交额是前 x 根k线中最低成交额的 y 倍 (x, y 自定义，勾选生效)
    let isVolSurge2Hit = false;
    let ratio2 = 0;
    let lookbackActualCount = 0;
    if (enableVolSurge2 && volSurge2Ratio > 0 && i > 0) {
      const lookbackBars = Math.max(1, Math.round(volSurge2Lookback || 5));
      const startIdx = Math.max(0, i - lookbackBars);
      let minTurnover = Infinity;
      for (let k = startIdx; k < i; k++) {
        const t = getCandleTurnover(candles[k]);
        if (t > 0 && t < minTurnover) {
          minTurnover = t;
        }
      }
      lookbackActualCount = i - startIdx;
      if (minTurnover !== Infinity && minTurnover > 0 && currTurnover > 0) {
        ratio2 = currTurnover / minTurnover;
        if (ratio2 >= volSurge2Ratio) {
          isVolSurge2Hit = true;
          tags.push(`放量2: 前${lookbackActualCount}根最低${ratio2.toFixed(1)}倍 (≥${volSurge2Ratio}x)`);
        }
      }
    }

    if (tags.length > 0) {
      let displayName = '定制特征K';
      const hitLabels: string[] = [];
      if (isGainHit) hitLabels.push('涨幅');
      if (isDropHit) hitLabels.push('跌幅');
      if (isAmpHit) hitLabels.push('振幅');
      if (isVolSurge1Hit) hitLabels.push(`放量1(${ratio1.toFixed(1)}x)`);
      if (isVolSurge2Hit) hitLabels.push(`放量2(${ratio2.toFixed(1)}x)`);

      if (hitLabels.length === 1) {
        displayName = `定制·${hitLabels[0]}达标`;
      } else if (hitLabels.length === 2) {
        displayName = `定制·${hitLabels.join('+')}`;
      } else {
        displayName = `定制·${hitLabels.length}项达标 (${hitLabels.slice(0, 2).join('+')}等)`;
      }

      events.push({
        index: i,
        timestamp: c.timestamp,
        type: 'CUSTOM_FEATURE',
        name: displayName,
        description: `${tags.join(' · ')} · 成交额: ${formatTurnoverShort(currTurnover)}`,
        changePct: c.changePct,
        volumeRatio: ratio1 > 0 ? Number(ratio1.toFixed(1)) : 1,
        price: c.close,
        category: 'custom',
        amplitudePct: c.amplitudePct,
      });
    }
  }

  return events;
}

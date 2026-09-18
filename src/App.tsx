import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  X, 
  AlertCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { TopNavigationBar } from './components/TopNavigationBar';
import { ChartHeader } from './components/ChartHeader';
import { KlineChart, KlineChartHandle } from './components/KlineChart';
import { DataManagementModal } from './components/DataManagementModal';
import { FeatureKModal, FEATURE_K_STORAGE_KEY, DEFAULT_FEATURE_K_SETTINGS } from './components/FeatureKModal';
import { TradeExecutionPanel } from './components/TradeExecutionPanel';
import { BacktestDashboard } from './components/BacktestDashboard';
import { 
  Candle, 
  CalculatedCandle, 
  TimeframeInterval, 
  BacktestState, 
  Position, 
  TradeRecord, 
  PositionSide,
  FeatureKEvent,
  FeatureKSettings,
  MarketSyncState,
  TradeConfig 
} from './types/market';
import { 
  aggregateCandles, 
  detectBaseInterval, 
  findCandleIndexByTimestamp, 
  getIntervalDurationMs 
} from './utils/resampler';
import { calculateIndicators, detectFeatureKEvents, detectCustomFeatureKEvents } from './utils/indicators';
import { formatExactPrice } from './utils/formatters';
import { generateSampleBTC15m } from './utils/sampleData';
import { fetchAllBinanceKlines, fetchBinanceKlines } from './utils/binanceApi';

interface ToastNotification {
  id: string;
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  message?: string;
}

export default function App() {
  const chartRef = useRef<KlineChartHandle>(null);

  // Raw market data state
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [rawCandles, setRawCandles] = useState<Candle[]>(() => generateSampleBTC15m());
  const [selectedInterval, setSelectedInterval] = useState<TimeframeInterval>('4h');
  const [hoveredCandle, setHoveredCandle] = useState<CalculatedCandle | null>(null);
  const [flashState, setFlashState] = useState<{ timestamp: number; triggerId: number } | null>(null);

  // Modals & Panels
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);
  const [isFeatureKModalOpen, setIsFeatureKModalOpen] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'trade' | 'backtest' | 'none'>('trade');
  const [autoSignalEnabled, setAutoSignalEnabled] = useState<boolean>(false);

  // "进阶练剑" Blind Practice State
  const [blindPractice, setBlindPractice] = useState<{
    isActive: boolean;
    realSymbol: string;
    aliasName: string;
    isRevealed: boolean;
  }>({
    isActive: false,
    realSymbol: '',
    aliasName: '',
    isRevealed: false,
  });

  const handleToggleBlindReveal = useCallback(() => {
    setBlindPractice((prev) => {
      const nextRevealed = !prev.isRevealed;
      const targetSymbolName = nextRevealed ? prev.realSymbol : prev.aliasName;

      // Update active positions and trades display name
      setBacktestState((bState) => ({
        ...bState,
        positions: bState.positions.map((p) => ({
          ...p,
          symbol: targetSymbolName,
        })),
        trades: bState.trades.map((t) => ({
          ...t,
          symbol: targetSymbolName,
        })),
      }));

      return {
        ...prev,
        isRevealed: nextRevealed,
      };
    });
  }, []);

  // Persistent Trade Configuration state across tab switches and reloads
  const [tradeConfig, setTradeConfig] = useState<TradeConfig>(() => {
    try {
      const saved = localStorage.getItem('binance_contract_trade_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          customTpPrice: parsed.customTpPrice || '',
          customSlPrice: parsed.customSlPrice || '',
        };
      }
    } catch (e) {
      console.warn('Failed to load trade config', e);
    }
    return {
      leverage: 10,
      marginPercent: 25,
      customMargin: '',
      tpEnabled: true,
      tpPercent: '5',
      customTpPrice: '',
      slEnabled: true,
      slPercent: '3',
      customSlPrice: '',
    };
  });

  const handleUpdateTradeConfig = useCallback((newConfig: Partial<TradeConfig>) => {
    setTradeConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem('binance_contract_trade_config', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save trade config', e);
      }
      return updated;
    });

    // If customTpPrice or customSlPrice is updated, dynamically sync to any existing open position
    if (newConfig.customTpPrice !== undefined || newConfig.customSlPrice !== undefined) {
      setBacktestState((prev) => {
        if (prev.positions.length === 0) return prev;
        const updatedPositions = prev.positions.map((pos) => {
          let tp = pos.takeProfit;
          let sl = pos.stopLoss;
          if (newConfig.customTpPrice !== undefined) {
            const customTp = parseFloat(newConfig.customTpPrice);
            tp = !isNaN(customTp) && customTp > 0 ? customTp : undefined;
          }
          if (newConfig.customSlPrice !== undefined) {
            const customSl = parseFloat(newConfig.customSlPrice);
            sl = !isNaN(customSl) && customSl > 0 ? customSl : undefined;
          }
          return { ...pos, takeProfit: tp, stopLoss: sl };
        });
        return { ...prev, positions: updatedPositions };
      });
    }
  }, []);

  // Market data background sync state
  const [syncState, setSyncState] = useState<MarketSyncState>({
    status: 'IDLE',
    symbol: 'BTCUSDT',
    interval: '15m',
    fetchedCount: 0,
  });
  const isMarketSyncing = syncState.status === 'SYNCING';

  // Toast notification state
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((title: string, type: 'warning' | 'success' | 'info' | 'error' = 'warning', message?: string, duration = 4000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({
      id: `toast-${Date.now()}`,
      type,
      title,
      message,
    });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  // Detect base interval of raw candles
  const baseIntervalInfo = useMemo(() => {
    return detectBaseInterval(rawCandles);
  }, [rawCandles]);

  // 1. Full aggregated & calculated candles for active timeframe (for timeline indexing, total count & feature pattern detection)
  const fullAggregatedCandles = useMemo(() => {
    return aggregateCandles(rawCandles, selectedInterval);
  }, [rawCandles, selectedInterval]);

  const fullCalculatedCandles = useMemo(() => {
    return calculateIndicators(fullAggregatedCandles);
  }, [fullAggregatedCandles]);

  // Persistent Feature K Settings state across sessions
  const [featureKSettings, setFeatureKSettings] = useState<FeatureKSettings>(() => {
    try {
      const saved = localStorage.getItem(FEATURE_K_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          enableSmart: parsed.enableSmart ?? false,
          enableCustom: parsed.enableCustom ?? true,
          customConfig: {
            minTurnover: Number(parsed.customConfig?.minTurnover ?? 8000000),
            enableGain: parsed.customConfig?.enableGain ?? true,
            gainThreshold: Number(parsed.customConfig?.gainThreshold ?? 10),
            enableDrop: parsed.customConfig?.enableDrop ?? true,
            dropThreshold: Number(parsed.customConfig?.dropThreshold ?? 10),
            enableAmplitude: parsed.customConfig?.enableAmplitude ?? true,
            amplitudeThreshold: Number(parsed.customConfig?.amplitudeThreshold ?? 15),
            enableVolSurge1: parsed.customConfig?.enableVolSurge1 ?? true,
            volSurge1Ratio: Number(parsed.customConfig?.volSurge1Ratio ?? 2),
            enableVolSurge2: parsed.customConfig?.enableVolSurge2 ?? true,
            volSurge2Lookback: Number(parsed.customConfig?.volSurge2Lookback ?? 5),
            volSurge2Ratio: Number(parsed.customConfig?.volSurge2Ratio ?? 5),
          },
        };
      }
    } catch (e) {
      console.warn('Failed to parse feature K settings', e);
    }
    return DEFAULT_FEATURE_K_SETTINGS;
  });

  const handleUpdateFeatureKSettings = useCallback((newSettings: FeatureKSettings) => {
    setFeatureKSettings(newSettings);
    try {
      localStorage.setItem(FEATURE_K_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save feature K settings to localStorage', e);
    }
  }, []);

  // Compute all matching Feature K events across the current timeframe
  const featureKEventMap = useMemo(() => {
    const map = new Map<number, FeatureKEvent>();
    if (!fullCalculatedCandles || fullCalculatedCandles.length === 0) return map;

    if (featureKSettings.enableSmart) {
      const smartEvents = detectFeatureKEvents(fullCalculatedCandles);
      for (const e of smartEvents) {
        map.set(e.timestamp, e);
      }
    }

    if (featureKSettings.enableCustom) {
      const customEvents = detectCustomFeatureKEvents(fullCalculatedCandles, featureKSettings.customConfig);
      for (const e of customEvents) {
        map.set(e.timestamp, e);
      }
    }

    return map;
  }, [fullCalculatedCandles, featureKSettings]);

  // Set of timestamps for permanent yellow border display on the chart
  const featureKTimestamps = useMemo(() => {
    return new Set(featureKEventMap.keys());
  }, [featureKEventMap]);

  // Anti-leakage / Multi-timeframe dynamic synthesis toggle (default: true)
  const [includeIncompleteBar, setIncludeIncompleteBar] = useState<boolean>(true);

  // Universal physical replay cutoff timestamp (ms) - strictly prevents lookahead bias
  const [replayCutoffTimestamp, setReplayCutoffTimestamp] = useState<number>(0);
  const currentReplayCompletedTimestampRef = useRef<number>(0);

  // Initialize replay timestamp on dataset load or reset
  useEffect(() => {
    if (fullCalculatedCandles.length > 0 && currentReplayCompletedTimestampRef.current === 0) {
      const duration = getIntervalDurationMs(selectedInterval, fullCalculatedCandles);
      const initialCutoff = fullCalculatedCandles[0].timestamp + duration - 1;
      currentReplayCompletedTimestampRef.current = initialCutoff;
      setReplayCutoffTimestamp(initialCutoff);
    }
  }, [fullCalculatedCandles, selectedInterval]);

  // 2. Active candles strictly filtered by replayCutoffTimestamp to completely prevent lookahead bias!
  const calculatedCandles = useMemo(() => {
    if (!rawCandles || rawCandles.length === 0) return [];

    const cutoff = replayCutoffTimestamp > 0 
      ? replayCutoffTimestamp 
      : currentReplayCompletedTimestampRef.current;

    if (cutoff <= 0) {
      return fullCalculatedCandles.slice(0, 1);
    }

    const resampled = aggregateCandles(rawCandles, selectedInterval, {
      maxTimestamp: cutoff,
      includeIncompleteBar,
    });
    return calculateIndicators(resampled);
  }, [rawCandles, selectedInterval, replayCutoffTimestamp, includeIncompleteBar, fullCalculatedCandles]);

  // Backtest engine state: Default to index 0 (displays only the first K-line initially)
  const [backtestState, setBacktestState] = useState<BacktestState>(() => {
    const initCandles = calculateIndicators(aggregateCandles(generateSampleBTC15m(), '4h'));
    return {
      isRunning: false,
      isPaused: false,
      currentIndex: 0, // Default to first K-line
      totalCandles: initCandles.length,
      playbackSpeedMs: 250,
      initialBalance: 10000,
      currentBalance: 10000,
      equity: 10000,
      positions: [],
      trades: [],
      equityHistory: [{ time: Date.now(), equity: 10000, balance: 10000 }],
    };
  });

  // Synchronize replay cursor when timeframe or active candles update
  useEffect(() => {
    if (!fullCalculatedCandles || fullCalculatedCandles.length === 0) {
      setBacktestState((prev) => ({
        ...prev,
        totalCandles: 0,
        currentIndex: 0,
      }));
      return;
    }

    const activeIndex = Math.max(0, calculatedCandles.length - 1);

    setBacktestState((prev) => ({
      ...prev,
      totalCandles: fullCalculatedCandles.length,
      currentIndex: activeIndex,
      currentReplayTime: currentReplayCompletedTimestampRef.current,
    }));
  }, [calculatedCandles, fullCalculatedCandles]);

  // Timer ref for backtest playback loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Core step execution logic for backtest with Strict Anti-Leakage Protection
  const advanceStep = useCallback(() => {
    if (fullCalculatedCandles.length === 0) return;

    const currentCutoff = currentReplayCompletedTimestampRef.current;
    const duration = getIntervalDurationMs(selectedInterval, fullCalculatedCandles);

    // Find where the current cutoff sits in fullCalculatedCandles
    const currIdx = findCandleIndexByTimestamp(fullCalculatedCandles, currentCutoff);
    const currBar = fullCalculatedCandles[currIdx];
    if (!currBar) return;

    let nextCutoff = 0;
    let nextIndex = 0;

    // Check if the current bar was only partially completed (e.g. user stepped in 4H, so now in 1D it's only 4h completed)
    const currBarEnd = currBar.timestamp + duration - 1;
    if (currentCutoff < currBarEnd) {
      // Step to complete the remainder of the current bar
      nextCutoff = currBarEnd;
      nextIndex = currIdx;
    } else if (currIdx + 1 < fullCalculatedCandles.length) {
      // Advance to the end of the next bar
      nextIndex = currIdx + 1;
      nextCutoff = fullCalculatedCandles[nextIndex].timestamp + duration - 1;
    } else {
      // Reached the end of available history
      setBacktestState((prev) => ({ ...prev, isRunning: false }));
      return;
    }

    currentReplayCompletedTimestampRef.current = nextCutoff;
    setReplayCutoffTimestamp(nextCutoff);

    const currentBar = fullCalculatedCandles[nextIndex];
    if (!currentBar) return;

    setBacktestState((prev) => {
      let newBalance = prev.currentBalance;
      const updatedPositions: Position[] = [];
      const newTrades: TradeRecord[] = [...prev.trades];
      let hasPositionClosed = false;

      // Update positions and check TP/SL/Liquidation
      for (const pos of prev.positions) {
        const isLong = pos.side === 'LONG';
        const priceDiff = isLong
          ? currentBar.close - pos.entryPrice
          : pos.entryPrice - currentBar.close;

        const pnl = priceDiff * pos.size;
        const pnlPct = (pnl / pos.margin) * 100;

        let shouldClose = false;
        let exitReason: TradeRecord['exitReason'] = 'MANUAL';
        let exitPrice = currentBar.close;

        // Check Take Profit
        if (pos.takeProfit) {
          if (isLong && currentBar.high >= pos.takeProfit) {
            shouldClose = true;
            exitReason = 'TAKE_PROFIT';
            exitPrice = pos.takeProfit;
          } else if (!isLong && currentBar.low <= pos.takeProfit) {
            shouldClose = true;
            exitReason = 'TAKE_PROFIT';
            exitPrice = pos.takeProfit;
          }
        }

        // Check Stop Loss
        if (!shouldClose && pos.stopLoss) {
          if (isLong && currentBar.low <= pos.stopLoss) {
            shouldClose = true;
            exitReason = 'STOP_LOSS';
            exitPrice = pos.stopLoss;
          } else if (!isLong && currentBar.high >= pos.stopLoss) {
            shouldClose = true;
            exitReason = 'STOP_LOSS';
            exitPrice = pos.stopLoss;
          }
        }

        // Check Liquidation
        if (!shouldClose) {
          if (isLong && currentBar.low <= pos.liquidationPrice) {
            shouldClose = true;
            exitReason = 'LIQUIDATION';
            exitPrice = pos.liquidationPrice;
          } else if (!isLong && currentBar.high >= pos.liquidationPrice) {
            shouldClose = true;
            exitReason = 'LIQUIDATION';
            exitPrice = pos.liquidationPrice;
          }
        }

        if (shouldClose) {
          hasPositionClosed = true;
          const finalPriceDiff = isLong ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
          const finalPnl = exitReason === 'LIQUIDATION' ? -pos.margin : finalPriceDiff * pos.size;
          const fee = pos.size * exitPrice * 0.0005; // 0.05% taker fee
          const netPnl = finalPnl - fee;

          newBalance += pos.margin + netPnl;
          newTrades.push({
            id: `T-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            symbol: pos.symbol,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice,
            size: pos.size,
            leverage: pos.leverage,
            entryTime: pos.entryTime,
            exitTime: currentBar.timestamp,
            pnl: netPnl,
            pnlPct: (netPnl / pos.margin) * 100,
            fee,
            exitReason,
          });
        } else {
          updatedPositions.push({
            ...pos,
            currentPrice: currentBar.close,
            unrealizedPnl: pnl,
            unrealizedPnlPct: pnlPct,
          });
        }
      }

      if (hasPositionClosed) {
        setTimeout(() => {
          handleUpdateTradeConfig({ customTpPrice: '', customSlPrice: '' });
        }, 0);
      }

      // Auto Signal Execution (if enabled and no position open)
      if (autoSignalEnabled && updatedPositions.length === 0 && nextIndex > 1) {
        const prevBar = fullCalculatedCandles[nextIndex - 1];
        if (currentBar.ma7 && currentBar.ma25 && prevBar.ma7 && prevBar.ma25) {
          const lev = tradeConfig.leverage || 10;
          const pct = (tradeConfig.marginPercent || 25) / 100;
          const margin = tradeConfig.customMargin 
            ? Math.min(parseFloat(tradeConfig.customMargin) || 100, newBalance)
            : Math.min(newBalance * pct, 2000);

          // Golden Cross -> Auto Long
          if (prevBar.ma7 <= prevBar.ma25 && currentBar.ma7 > currentBar.ma25 && newBalance >= 50 && margin > 0) {
            const size = (margin * lev) / currentBar.close;
            const liq = currentBar.close * (1 - 0.9 / lev);

            let tp: number | undefined;
            let sl: number | undefined;
            if (tradeConfig.tpEnabled) {
              const tpP = parseFloat(tradeConfig.tpPercent);
              if (!isNaN(tpP) && tpP > 0) tp = currentBar.close * (1 + tpP / 100 / lev);
            }
            if (tradeConfig.slEnabled) {
              const slP = parseFloat(tradeConfig.slPercent);
              if (!isNaN(slP) && slP > 0) sl = currentBar.close * (1 - slP / 100 / lev);
            }

            newBalance -= margin;
            updatedPositions.push({
              id: `POS-${Date.now()}`,
              symbol,
              side: 'LONG',
              entryPrice: currentBar.close,
              currentPrice: currentBar.close,
              size,
              margin,
              leverage: lev,
              liquidationPrice: liq,
              takeProfit: tp,
              stopLoss: sl,
              entryTime: currentBar.timestamp,
              unrealizedPnl: 0,
              unrealizedPnlPct: 0,
            });
          }
          // Death Cross -> Auto Short
          else if (prevBar.ma7 >= prevBar.ma25 && currentBar.ma7 < currentBar.ma25 && newBalance >= 50 && margin > 0) {
            const size = (margin * lev) / currentBar.close;
            const liq = currentBar.close * (1 + 0.9 / lev);

            let tp: number | undefined;
            let sl: number | undefined;
            if (tradeConfig.tpEnabled) {
              const tpP = parseFloat(tradeConfig.tpPercent);
              if (!isNaN(tpP) && tpP > 0) tp = currentBar.close * (1 - tpP / 100 / lev);
            }
            if (tradeConfig.slEnabled) {
              const slP = parseFloat(tradeConfig.slPercent);
              if (!isNaN(slP) && slP > 0) sl = currentBar.close * (1 + slP / 100 / lev);
            }

            newBalance -= margin;
            updatedPositions.push({
              id: `POS-${Date.now()}`,
              symbol,
              side: 'SHORT',
              entryPrice: currentBar.close,
              currentPrice: currentBar.close,
              size,
              margin,
              leverage: lev,
              liquidationPrice: liq,
              takeProfit: tp,
              stopLoss: sl,
              entryTime: currentBar.timestamp,
              unrealizedPnl: 0,
              unrealizedPnlPct: 0,
            });
          }
        }
      }

      // Calculate total equity (Balance + Allocated Margin + Unrealized PnL)
      const allocatedMargin = updatedPositions.reduce((sum, p) => sum + p.margin, 0);
      const totalUnrealized = updatedPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
      const totalEquity = newBalance + allocatedMargin + totalUnrealized;

      return {
        ...prev,
        currentIndex: nextIndex,
        totalCandles: fullCalculatedCandles.length,
        currentReplayTime: nextCutoff,
        currentBalance: newBalance,
        equity: totalEquity,
        positions: updatedPositions,
        trades: newTrades,
        equityHistory: [
          ...prev.equityHistory,
          { time: currentBar.timestamp, equity: totalEquity, balance: newBalance },
        ],
      };
    });
  }, [fullCalculatedCandles, selectedInterval, autoSignalEnabled, symbol]);

  // Backtest loop effect
  useEffect(() => {
    if (backtestState.isRunning) {
      timerRef.current = setInterval(() => {
        advanceStep();
      }, backtestState.playbackSpeedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [backtestState.isRunning, backtestState.playbackSpeedMs, advanceStep]);

  // Start / Pause toggle with Strict Synchronization Guard
  const handleTogglePlay = () => {
    if (isMarketSyncing) {
      showToast('行情尚未同步完成，请稍后', 'warning', '当前正在从币安异步拉取全部历史K线，并执行防限流保护。请等待同步结束后再开始回测。');
      return;
    }

    setBacktestState((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
    }));
  };

  // Step +1 button with Strict Synchronization Guard
  const handleStepForward = () => {
    if (isMarketSyncing) {
      showToast('行情尚未同步完成，请稍后', 'warning', '行情数据正在安全同步中，请等待同步完成。');
      return;
    }

    if (!backtestState.isRunning) {
      advanceStep();
    }
  };

  // Reset backtest state (resets back to first candle)
  const handleResetBacktest = () => {
    if (fullCalculatedCandles.length > 0) {
      const duration = getIntervalDurationMs(selectedInterval, fullCalculatedCandles);
      const initialCutoff = fullCalculatedCandles[0].timestamp + duration - 1;
      currentReplayCompletedTimestampRef.current = initialCutoff;
      setReplayCutoffTimestamp(initialCutoff);
    } else {
      currentReplayCompletedTimestampRef.current = 0;
      setReplayCutoffTimestamp(0);
    }

    setBacktestState((prev) => ({
      ...prev,
      isRunning: false,
      currentIndex: 0, // Reset to 1st candle
      currentBalance: prev.initialBalance,
      equity: prev.initialBalance,
      positions: [],
      trades: [],
      equityHistory: [{ time: fullCalculatedCandles[0]?.timestamp || Date.now(), equity: prev.initialBalance, balance: prev.initialBalance }],
    }));
  };

  // Jump to feature K-line with Synchronization Guard
  const handleJumpToEvent = (event: FeatureKEvent) => {
    if (isMarketSyncing) {
      showToast('行情尚未同步完成，请稍后', 'warning', '数据同步中无法跳转特征K线。');
      return;
    }

    const duration = getIntervalDurationMs(selectedInterval, fullCalculatedCandles);
    const targetCutoff = event.timestamp + duration - 1;
    currentReplayCompletedTimestampRef.current = targetCutoff;
    setReplayCutoffTimestamp(targetCutoff);

    setFlashState({ timestamp: event.timestamp, triggerId: Date.now() });

    setBacktestState((prev) => ({
      ...prev,
      isRunning: false,
      currentIndex: event.index,
      currentReplayTime: targetCutoff,
    }));
  };

  // Direct Jump to the closest feature K-line after the current K-line
  const handleDirectJumpToFeatureK = () => {
    if (isMarketSyncing) {
      showToast('行情尚未同步完成，请稍后', 'warning', '数据同步中无法跳转特征K线。');
      return;
    }

    if (!fullCalculatedCandles || fullCalculatedCandles.length === 0) {
      showToast('暂无行情数据', 'warning', '未获取到行情K线，无法检索特征K');
      return;
    }

    // 1. Get all events matching active configuration from featureKEventMap
    const allEvents = Array.from(featureKEventMap.values());

    if (allEvents.length === 0) {
      showToast(
        '未检索到特征K线',
        'warning',
        '当前设置下未检索到满足条件的特征K线，请点击顶部「跳至特征K」检查或调整筛选条件。'
      );
      return;
    }

    // 3. Sort ascending by index
    allEvents.sort((a, b) => a.index - b.index);

    // 4. Find the closest event forward (index > currentIndex)
    const currentIdx = backtestState.currentIndex;
    const forwardEvents = allEvents.filter((e) => e.index > currentIdx);

    if (forwardEvents.length === 0) {
      showToast(
        '已达最后一根特征K线',
        'info',
        `当前位置（第 ${currentIdx + 1} 根）之后已无更多满足条件的特征K线（全量共检索到 ${allEvents.length} 处特征K）。`
      );
      return;
    }

    const targetEvent = forwardEvents[0];
    const targetIdx = targetEvent.index;
    const duration = getIntervalDurationMs(selectedInterval, fullCalculatedCandles);
    const targetCutoff = targetEvent.timestamp + duration - 1;
    currentReplayCompletedTimestampRef.current = targetCutoff;
    setReplayCutoffTimestamp(targetCutoff);

    // 5. Update state and step through positions if any exist
    setBacktestState((prev) => {
      let currentBalance = prev.currentBalance;
      const newTrades = [...prev.trades];
      let activePositions = [...prev.positions];
      let hasPositionClosed = false;

      if (activePositions.length > 0) {
        for (let idx = currentIdx + 1; idx <= targetIdx; idx++) {
          const bar = fullCalculatedCandles[idx];
          if (!bar) break;

          const remainingPos: Position[] = [];
          for (const pos of activePositions) {
            const isLong = pos.side === 'LONG';
            const priceDiff = isLong ? bar.close - pos.entryPrice : pos.entryPrice - bar.close;
            const pnl = priceDiff * pos.size;
            const pnlPct = (pnl / pos.margin) * 100;

            let shouldClose = false;
            let exitReason: TradeRecord['exitReason'] = 'MANUAL';
            let exitPrice = bar.close;

            // Check Take Profit
            if (pos.takeProfit) {
              if (isLong && bar.high >= pos.takeProfit) {
                shouldClose = true;
                exitReason = 'TAKE_PROFIT';
                exitPrice = pos.takeProfit;
              } else if (!isLong && bar.low <= pos.takeProfit) {
                shouldClose = true;
                exitReason = 'TAKE_PROFIT';
                exitPrice = pos.takeProfit;
              }
            }

            // Check Stop Loss
            if (!shouldClose && pos.stopLoss) {
              if (isLong && bar.low <= pos.stopLoss) {
                shouldClose = true;
                exitReason = 'STOP_LOSS';
                exitPrice = pos.stopLoss;
              } else if (!isLong && bar.high >= pos.stopLoss) {
                shouldClose = true;
                exitReason = 'STOP_LOSS';
                exitPrice = pos.stopLoss;
              }
            }

            // Check Liquidation
            if (!shouldClose) {
              if (isLong && bar.low <= pos.liquidationPrice) {
                shouldClose = true;
                exitReason = 'LIQUIDATION';
                exitPrice = pos.liquidationPrice;
              } else if (!isLong && bar.high >= pos.liquidationPrice) {
                shouldClose = true;
                exitReason = 'LIQUIDATION';
                exitPrice = pos.liquidationPrice;
              }
            }

            if (shouldClose) {
              hasPositionClosed = true;
              const finalPriceDiff = isLong ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
              const finalPnl = exitReason === 'LIQUIDATION' ? -pos.margin : finalPriceDiff * pos.size;
              const fee = pos.size * exitPrice * 0.0005;
              const netPnl = finalPnl - fee;

              currentBalance += pos.margin + netPnl;
              newTrades.push({
                id: `T-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                symbol: pos.symbol,
                side: pos.side,
                entryPrice: pos.entryPrice,
                exitPrice,
                size: pos.size,
                leverage: pos.leverage,
                entryTime: pos.entryTime,
                exitTime: bar.timestamp,
                pnl: netPnl,
                pnlPct: (netPnl / pos.margin) * 100,
                fee,
                exitReason,
              });
            } else {
              remainingPos.push({
                ...pos,
                currentPrice: bar.close,
                unrealizedPnl: pnl,
                unrealizedPnlPct: pnlPct,
              });
            }
          }
          activePositions = remainingPos;
        }
      }

      if (hasPositionClosed) {
        setTimeout(() => {
          handleUpdateTradeConfig({ customTpPrice: '', customSlPrice: '' });
        }, 0);
      }

      const currentBar = fullCalculatedCandles[targetIdx];

      setFlashState({ timestamp: currentBar.timestamp, triggerId: Date.now() });

      const finalPositions = activePositions.map((p) => {
        const isLong = p.side === 'LONG';
        const priceDiff = isLong ? currentBar.close - p.entryPrice : p.entryPrice - currentBar.close;
        const pnl = priceDiff * p.size;
        const pnlPct = (pnl / p.margin) * 100;
        return {
          ...p,
          currentPrice: currentBar.close,
          unrealizedPnl: pnl,
          unrealizedPnlPct: pnlPct,
        };
      });

      const allocatedMargin = finalPositions.reduce((sum, p) => sum + p.margin, 0);
      const totalUnrealized = finalPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
      const totalEquity = currentBalance + allocatedMargin + totalUnrealized;

      return {
        ...prev,
        isRunning: false,
        currentIndex: targetIdx,
        currentReplayTime: targetCutoff,
        currentBalance,
        equity: totalEquity,
        positions: finalPositions,
        trades: newTrades,
        equityHistory: [
          ...prev.equityHistory,
          { time: currentBar.timestamp, equity: totalEquity, balance: currentBalance },
        ],
      };
    });

    const stepDiff = targetIdx - currentIdx;
    showToast(
      '已直达特征K线',
      'success',
      `向前步进 ${stepDiff} 根K线至第 ${targetIdx + 1} 根: 【${targetEvent.name}】（${formatExactPrice(targetEvent.price)} USDT）`
    );
  };

  // Online Full Sync Engine (15m full history + rate limit cooldown protection)
  const handleStartOnlineSync = async (
    targetSymbol: string,
    syncInterval: string = '15m',
    marketType: 'futures' | 'spot' = 'futures',
    fetchAll: boolean = true,
    isBlindPractice: boolean = false,
    blindAlias: string = ''
  ) => {
    setSymbol(targetSymbol);

    if (isBlindPractice) {
      setBlindPractice({
        isActive: true,
        realSymbol: targetSymbol,
        aliasName: blindAlias || '【神秘标的】',
        isRevealed: false,
      });
      setSyncState({
        status: 'SYNCING',
        symbol: targetSymbol,
        interval: syncInterval,
        fetchedCount: 0,
        statusText: `⚔️「进阶练剑」已就绪！随机匹配未知永续币对 ${blindAlias}，正在拉取 15m 全量历史K线...`,
      });
    } else {
      setBlindPractice({
        isActive: false,
        realSymbol: targetSymbol,
        aliasName: '',
        isRevealed: false,
      });
      setSyncState({
        status: 'SYNCING',
        symbol: targetSymbol,
        interval: syncInterval,
        fetchedCount: 0,
        statusText: `正在安全连接币安服务器，准备拉取 ${targetSymbol} 全量 ${syncInterval} 历史行情...`,
      });
    }

    // Stop and lock backtest, reset replay timestamp
    currentReplayCompletedTimestampRef.current = 0;
    setBacktestState((prev) => ({
      ...prev,
      isRunning: false,
      currentIndex: 0,
    }));

    try {
      let loadedCandles: Candle[] = [];

      if (fetchAll) {
        loadedCandles = await fetchAllBinanceKlines({
          symbol: targetSymbol,
          interval: syncInterval,
          marketType,
          onProgress: (fetched, total, text) => {
            setSyncState((prev) => ({
              ...prev,
              fetchedCount: fetched,
              statusText: text,
            }));
          },
        });
      } else {
        loadedCandles = await fetchBinanceKlines({
          symbol: targetSymbol,
          interval: syncInterval,
          limit: 1000,
          marketType,
          onProgress: (fetched, total, text) => {
            setSyncState((prev) => ({
              ...prev,
              fetchedCount: fetched,
              statusText: text,
            }));
          },
        });
      }

      if (loadedCandles.length > 0) {
        setRawCandles(loadedCandles);
        setSyncState({
          status: 'COMPLETE',
          symbol: targetSymbol,
          interval: syncInterval,
          fetchedCount: loadedCandles.length,
          statusText: isBlindPractice
            ? `⚔️ 进阶练剑行情就绪！已同步 ${loadedCandles.length.toLocaleString()} 根 15m K线（币对名称已隐藏）`
            : `全量行情同步完成！共获得 ${loadedCandles.length.toLocaleString()} 根 ${syncInterval} K线`,
          lastCompletedAt: Date.now(),
        });

        // Adapt default aggregation
        if (syncInterval === '15m') {
          setSelectedInterval('4h');
        } else {
          setSelectedInterval('raw');
        }

        // Requirement 2: 行情同步完成后，默认在主界面只显示第一根K线，在用户开始回测之后才开始k线步进
        currentReplayCompletedTimestampRef.current = 0;
        setReplayCutoffTimestamp(0);
        setBacktestState((prev) => ({
          ...prev,
          isRunning: false,
          currentIndex: 0, // ONLY DISPLAY FIRST CANDLE!
          totalCandles: loadedCandles.length,
          currentBalance: prev.initialBalance,
          equity: prev.initialBalance,
          positions: [],
          trades: [],
          equityHistory: [{ time: loadedCandles[0].timestamp, equity: prev.initialBalance, balance: prev.initialBalance }],
        }));

        // Completion Announcement Notification
        if (isBlindPractice) {
          showToast(
            '⚔️ 进阶练剑·盲测就绪！',
            'success',
            `已为您随机抽取未知永续合约 ${blindAlias} 并同步全部 15m 历史K线（共 ${loadedCandles.length.toLocaleString()} 根）！代码名称已隐藏，请根据纯粹盘面K线做出客观回测。回测完成后可在图表顶部随时点击揭晓真实代码！`,
            9000
          );
        } else {
          showToast(
            '行情同步工作已全部结束！',
            'success',
            `已成功安全同步 ${targetSymbol} 全部历史 ${syncInterval} K线（共 ${loadedCandles.length.toLocaleString()} 根）。默认在主界面只显示第一根K线，点击「开始回测」即可开始步进！`,
            8000
          );
        }
      } else {
        setSyncState((prev) => ({
          ...prev,
          status: 'FAILED',
          errorMessage: '未能拉取到有效行情数据',
        }));
        showToast('行情同步失败', 'error', '未获取到有效数据，请检查交易对后重试');
      }
    } catch (err: any) {
      setSyncState((prev) => ({
        ...prev,
        status: 'FAILED',
        errorMessage: err.message || '行情同步过程发生异常',
      }));
      showToast('行情同步中断', 'error', err.message || '请检查网络或交易对后重试');
    }
  };

  // Load new dataset handler (from file upload or sample)
  const handleDataLoaded = (newCandles: Candle[], newSymbol: string, intervalLabel: string) => {
    setBlindPractice({
      isActive: false,
      realSymbol: newSymbol,
      aliasName: '',
      isRevealed: false,
    });
    setRawCandles(newCandles);
    setSymbol(newSymbol);

    // Auto adapt aggregation interval if appropriate
    if (intervalLabel === '1m' || intervalLabel === '5m' || intervalLabel === '15m') {
      setSelectedInterval('4h');
    } else if (intervalLabel === '1h') {
      setSelectedInterval('4h');
    } else {
      setSelectedInterval('raw');
    }

    setSyncState({
      status: 'COMPLETE',
      symbol: newSymbol,
      interval: intervalLabel,
      fetchedCount: newCandles.length,
      statusText: `本地数据加载完成 (${newCandles.length} 根)`,
      lastCompletedAt: Date.now(),
    });

    // Reset backtest cursor to 0 (first candle) and reset replay timestamp
    currentReplayCompletedTimestampRef.current = 0;
    setReplayCutoffTimestamp(0);
    setBacktestState((prev) => ({
      ...prev,
      isRunning: false,
      currentIndex: 0, // Only display first candle
      totalCandles: newCandles.length,
      currentBalance: prev.initialBalance,
      equity: prev.initialBalance,
      positions: [],
      trades: [],
    }));

    showToast('行情加载完成', 'success', `已成功载入 ${newSymbol} 数据 (共 ${newCandles.length.toLocaleString()} 根)，默认展示第 1 根 K线，点击「开始回测」开始步进。`);
  };

  // Manual Position Open
  const handleOpenPosition = (
    side: PositionSide,
    margin: number,
    leverage: number,
    takeProfit?: number,
    stopLoss?: number
  ) => {
    if (isMarketSyncing) {
      showToast('行情尚未同步完成，请稍后', 'warning', '数据同步期间禁止下单。');
      return;
    }

    const currentBar = calculatedCandles[backtestState.currentIndex];
    if (!currentBar || margin > backtestState.currentBalance) return;

    const entryPrice = currentBar.close;
    const size = (margin * leverage) / entryPrice;
    const liqPrice = side === 'LONG'
      ? entryPrice * (1 - 0.9 / leverage)
      : entryPrice * (1 + 0.9 / leverage);

    const posSymbol = (blindPractice.isActive && !blindPractice.isRevealed)
      ? blindPractice.aliasName
      : symbol;

    const newPosition: Position = {
      id: `POS-${Date.now()}`,
      symbol: posSymbol,
      side,
      entryPrice,
      currentPrice: entryPrice,
      size,
      margin,
      leverage,
      liquidationPrice: liqPrice,
      takeProfit,
      stopLoss,
      entryTime: currentBar.timestamp,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
    };

    setBacktestState((prev) => ({
      ...prev,
      currentBalance: prev.currentBalance - margin,
      positions: [...prev.positions, newPosition],
    }));
  };

  // Manual Position Close
  const handleClosePosition = (positionId: string) => {
    const currentBar = calculatedCandles[backtestState.currentIndex];
    if (!currentBar) return;

    // Reset custom TP and SL price back to empty after closing action
    handleUpdateTradeConfig({ customTpPrice: '', customSlPrice: '' });

    setBacktestState((prev) => {
      const pos = prev.positions.find((p) => p.id === positionId);
      if (!pos) return prev;

      const isLong = pos.side === 'LONG';
      const exitPrice = currentBar.close;
      const priceDiff = isLong ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
      const grossPnl = priceDiff * pos.size;
      const fee = pos.size * exitPrice * 0.0005;
      const netPnl = grossPnl - fee;

      const newBalance = prev.currentBalance + pos.margin + netPnl;
      const remainingPositions = prev.positions.filter((p) => p.id !== positionId);

      const newTrade: TradeRecord = {
        id: `T-${Date.now()}`,
        symbol: pos.symbol,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice,
        size: pos.size,
        leverage: pos.leverage,
        entryTime: pos.entryTime,
        exitTime: currentBar.timestamp,
        pnl: netPnl,
        pnlPct: (netPnl / pos.margin) * 100,
        fee,
        exitReason: 'MANUAL',
      };

      const allocatedMargin = remainingPositions.reduce((sum, p) => sum + p.margin, 0);
      const totalUnrealized = remainingPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

      return {
        ...prev,
        currentBalance: newBalance,
        equity: newBalance + allocatedMargin + totalUnrealized,
        positions: remainingPositions,
        trades: [...prev.trades, newTrade],
      };
    });
  };

  // Manual Reverse Position
  const handleReversePosition = (positionId: string) => {
    if (isMarketSyncing) {
      showToast('行情尚未同步完成，请稍后', 'warning', '数据同步中禁止反手操作。');
      return;
    }

    const currentBar = calculatedCandles[backtestState.currentIndex];
    if (!currentBar) return;

    const pos = backtestState.positions.find((p) => p.id === positionId);
    if (!pos) return;

    // Close existing
    handleClosePosition(positionId);

    // Open reverse with same margin & leverage
    const reverseSide: PositionSide = pos.side === 'LONG' ? 'SHORT' : 'LONG';
    setTimeout(() => {
      handleOpenPosition(reverseSide, pos.margin, pos.leverage);
    }, 50);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a1017] text-slate-100 font-sans overflow-hidden relative">
      {/* Sync Status Banner */}
      {isMarketSyncing && (
        <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-slate-900 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shadow-lg z-40">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
            <span className="font-semibold text-amber-300">
              [币安行情防限流同步中]
            </span>
            <span className="text-slate-300">
              {syncState.statusText || `正在安全拉取 ${syncState.symbol} 全量 15m K线...`}
            </span>
            <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-amber-300 font-bold border border-amber-500/30">
              已同步 {syncState.fetchedCount.toLocaleString()} 根
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>智能规避 429 访问受限 · 回测功能已安全锁定</span>
          </div>
        </div>
      )}

      {/* Floating Prompt Toast Notification ("行情尚未同步完成，请稍后" or other state updates) */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 max-w-md animate-in slide-in-from-top-4 fade-in duration-200">
          <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 ${
            toast.type === 'warning'
              ? 'bg-[#1a1508]/95 border-amber-500/60 text-amber-200 shadow-amber-950/50'
              : toast.type === 'error'
              ? 'bg-[#1f0b0b]/95 border-rose-500/60 text-rose-200 shadow-rose-950/50'
              : toast.type === 'success'
              ? 'bg-[#081a13]/95 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50'
              : 'bg-[#0b1726]/95 border-cyan-500/60 text-cyan-200 shadow-cyan-950/50'
          }`}>
            <div className="mt-0.5 flex-shrink-0">
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'error' && <ShieldAlert className="w-5 h-5 text-rose-400" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'info' && <Clock className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm tracking-wide flex items-center gap-2">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-xs mt-1 leading-relaxed opacity-90 text-slate-300">
                  {toast.message}
                </p>
              )}
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Top Navigation Bar matching screenshot */}
      <TopNavigationBar
        currentInterval={selectedInterval}
        baseInterval={baseIntervalInfo.label}
        onSelectInterval={(interval) => setSelectedInterval(interval)}
        isRunning={backtestState.isRunning}
        onTogglePlay={handleTogglePlay}
        onStepForward={handleStepForward}
        onOpenFeatureK={() => {
          if (isMarketSyncing) {
            showToast('行情尚未同步完成，请稍后', 'warning', '数据同步中无法跳转特征K线。');
            return;
          }
          setIsFeatureKModalOpen(true);
        }}
        onReset={handleResetBacktest}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        activeBottomTab={activeBottomTab}
        onToggleBottomTab={(tab) => {
          setActiveBottomTab((prev) => (prev === tab ? 'none' : tab));
        }}
        syncState={syncState}
        includeIncompleteBar={includeIncompleteBar}
        onToggleIncompleteBar={setIncludeIncompleteBar}
      />

      {/* 2. Chart Info Sub-Header matching screenshot */}
      {(() => {
        const activeBar = hoveredCandle || calculatedCandles[backtestState.currentIndex] || calculatedCandles[0] || null;
        const isCurFeatureK = activeBar ? featureKTimestamps.has(activeBar.timestamp) : false;
        const curFeatureKEvent = activeBar ? featureKEventMap.get(activeBar.timestamp) : undefined;

        return (
          <ChartHeader
            symbol={symbol}
            currentInterval={selectedInterval}
            activeCandle={activeBar}
            onZoomIn={() => chartRef.current?.zoomIn()}
            onZoomOut={() => chartRef.current?.zoomOut()}
            onResetView={() => {
              chartRef.current?.autoFit();
            }}
            onOpenSearch={() => {
              if (isMarketSyncing) {
                showToast('行情尚未同步完成，请稍后', 'warning', '数据同步中无法跳转特征K线。');
                return;
              }
              setIsFeatureKModalOpen(true);
            }}
            blindPractice={blindPractice}
            onToggleBlindReveal={handleToggleBlindReveal}
            isFeatureK={isCurFeatureK}
            featureKName={curFeatureKEvent?.name}
          />
        );
      })()}

      {/* 3. Main Candlestick Chart Stage */}
      <main 
        className="flex-1 relative w-full h-full min-h-0 bg-[#0a1017] overflow-hidden focus:outline-none"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleStepForward();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleDirectJumpToFeatureK();
          }
        }}
      >
        <KlineChart
          ref={chartRef}
          candles={calculatedCandles}
          trades={backtestState.trades}
          positions={backtestState.positions}
          onHoverCandle={setHoveredCandle}
          replayIndex={backtestState.currentIndex}
          flashTimestamp={flashState?.timestamp}
          flashTriggerId={flashState?.triggerId}
          featureKTimestamps={featureKTimestamps}
        />
      </main>

      {/* 4. Bottom Collapsible Workstation: Trade Execution or Backtest Stats */}
      {activeBottomTab === 'trade' && (
        <TradeExecutionPanel
          activeCandle={calculatedCandles[backtestState.currentIndex] || null}
          accountBalance={backtestState.currentBalance}
          positions={backtestState.positions}
          trades={backtestState.trades}
          onClearTrades={() => setBacktestState((prev) => ({ ...prev, trades: [] }))}
          tradeConfig={tradeConfig}
          onUpdateTradeConfig={handleUpdateTradeConfig}
          onOpenPosition={handleOpenPosition}
          onClosePosition={handleClosePosition}
          onReversePosition={handleReversePosition}
          autoSignalEnabled={autoSignalEnabled}
          onToggleAutoSignal={(enabled) => setAutoSignalEnabled(enabled)}
          onDirectJumpToFeatureK={handleDirectJumpToFeatureK}
        />
      )}

      {activeBottomTab === 'backtest' && (
        <BacktestDashboard
          backtestState={backtestState}
          onSetSpeed={(speed) => setBacktestState((prev) => ({ ...prev, playbackSpeedMs: speed }))}
          onClearTrades={() => setBacktestState((prev) => ({ ...prev, trades: [] }))}
        />
      )}

      {/* 5. Modals */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onDataLoaded={handleDataLoaded}
        currentSymbol={symbol}
        syncState={syncState}
        onStartOnlineSync={handleStartOnlineSync}
      />

      <FeatureKModal
        isOpen={isFeatureKModalOpen}
        onClose={() => setIsFeatureKModalOpen(false)}
        candles={fullCalculatedCandles}
        currentInterval={selectedInterval}
        onJumpToEvent={handleJumpToEvent}
        settings={featureKSettings}
        onUpdateSettings={handleUpdateFeatureKSettings}
      />
    </div>
  );
}

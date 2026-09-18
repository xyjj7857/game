export type TimeframeInterval = 
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '1w'
  | 'raw';

export interface Candle {
  timestamp: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number; // quote asset volume in USDT
  tradesCount?: number;
  isClosed?: boolean;
  progressText?: string;
  progressPct?: number;
}

export interface IndicatorMA {
  ma7?: number;
  ma25?: number;
  ma99?: number;
  volumeMa?: number;
}

export interface CalculatedCandle extends Candle, IndicatorMA {
  index: number;
  changePct: number;
  amplitudePct: number;
}

export type OrderDirection = 'LONG' | 'SHORT';
export type OrderType = 'MARKET' | 'LIMIT';
export type PositionSide = 'LONG' | 'SHORT';

export interface TradeConfig {
  leverage: number;
  marginPercent: number;
  customMargin?: string;
  tpEnabled: boolean;
  tpPercent: string;
  customTpPrice?: string; // 用户自定义止盈价 (平仓后自动置空)
  slEnabled: boolean;
  slPercent: string;
  customSlPrice?: string; // 用户自定义止损价 (平仓后自动置空)
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  size: number; // Amount in contracts / base asset
  margin: number; // USDT allocated
  leverage: number;
  liquidationPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  entryTime: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPct: number;
  fee: number;
  exitReason: 'MANUAL' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'LIQUIDATION' | 'SIGNAL';
}

export interface BacktestState {
  isRunning: boolean;
  isPaused: boolean;
  currentIndex: number; // Index in the active candle list
  totalCandles: number;
  currentReplayTime?: number; // Universal physical timestamp (ms) for cross-timeframe anti-leakage replay
  playbackSpeedMs: number; // ms per step (e.g. 200ms)
  initialBalance: number;
  currentBalance: number;
  equity: number;
  positions: Position[];
  trades: TradeRecord[];
  equityHistory: { time: number; equity: number; balance: number }[];
}

export interface CooldownStatus {
  lastRequestTime: number;
  requestCountLastMinute: number;
  maxRequestsPerMinute: number;
  cooldownRemainingSeconds: number;
  isThrottled: boolean;
  rateLimitWeightUsed: number;
  maxWeight: number;
}

export type MarketSyncStatus = 'IDLE' | 'SYNCING' | 'COMPLETE' | 'FAILED';

export interface MarketSyncState {
  status: MarketSyncStatus;
  symbol: string;
  interval: string;
  fetchedCount: number;
  startDate?: string;
  endDate?: string;
  statusText?: string;
  errorMessage?: string | null;
  lastCompletedAt?: number;
}

export interface FeatureKEvent {
  index: number;
  timestamp: number;
  type: 'BULLISH_SURGE' | 'BEARISH_PLUNGE' | 'HIGH_VOLUME' | 'PIN_BAR' | 'MA_GOLDEN_CROSS' | 'MA_DEATH_CROSS' | 'CUSTOM_FEATURE';
  name: string;
  description: string;
  changePct: number;
  volumeRatio: number;
  price: number;
  category?: 'smart' | 'custom';
  amplitudePct?: number;
}

export interface CustomFeatureKConfig {
  minTurnover: number; // in USDT (global condition, required)
  enableGain: boolean;
  gainThreshold: number; // in %
  enableDrop: boolean;
  dropThreshold: number; // in %
  enableAmplitude: boolean;
  amplitudeThreshold: number; // in %
  // 放量1: 最新的这一根k线的成交额是上一根k线的成交额的a倍，a自定义 (勾选生效)
  enableVolSurge1: boolean;
  volSurge1Ratio: number; // a 倍
  // 放量2: 最新的这一根k线的成交额是前x根k线中最低成交额的y倍，y自定义 (勾选生效)
  enableVolSurge2: boolean;
  volSurge2Lookback: number; // 前 x 根
  volSurge2Ratio: number; // y 倍
}

export interface FeatureKSettings {
  enableSmart: boolean;
  enableCustom: boolean;
  customConfig: CustomFeatureKConfig;
}

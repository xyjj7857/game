import React from 'react';
import { ZoomIn, ZoomOut, Search, RotateCcw, Swords, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { CalculatedCandle, TimeframeInterval } from '../types/market';
import { INTERVAL_LABELS } from '../utils/resampler';
import { formatExactPrice } from '../utils/formatters';

interface ChartHeaderProps {
  symbol: string;
  currentInterval: TimeframeInterval;
  activeCandle?: CalculatedCandle | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenSearch: () => void;
  blindPractice?: {
    isActive: boolean;
    realSymbol: string;
    aliasName: string;
    isRevealed: boolean;
  };
  onToggleBlindReveal?: () => void;
  isFeatureK?: boolean;
  featureKName?: string;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  symbol,
  currentInterval,
  activeCandle,
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenSearch,
  blindPractice,
  onToggleBlindReveal,
  isFeatureK,
  featureKName,
}) => {
  if (!activeCandle) {
    return (
      <div className="h-14 bg-[#080d14] border-b border-[#182330] px-4 flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>等待行情数据加载...</span>
      </div>
    );
  }

  // Format date time with full year e.g. "2026/01/24 22:00"
  const dateObj = new Date(activeCandle.timestamp);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const formattedTime = `${year}/${month}/${day} ${hours}:${minutes}`;

  // Exact price formatting: strictly preserve raw unrounded exchange/file data
  const formatPrice = (val?: number | null) => {
    return formatExactPrice(val);
  };

  const isUp = activeCandle.close >= activeCandle.open;
  const isChangePositive = activeCandle.changePct >= 0;

  // Turnover format in Wan (10k) or Million USDT
  const turnoverVal = activeCandle.turnover || (activeCandle.volume * activeCandle.close);
  let formattedTurnover = '';
  if (turnoverVal >= 100000000) {
    formattedTurnover = `${(turnoverVal / 100000000).toFixed(2)}亿 U`;
  } else if (turnoverVal >= 10000) {
    formattedTurnover = `${(turnoverVal / 10000).toFixed(1)}万 U`;
  } else {
    formattedTurnover = `${turnoverVal.toFixed(1)} U`;
  }

  const intervalLabel = INTERVAL_LABELS[currentInterval] || currentInterval;

  return (
    <div className="h-14 bg-[#090e15] border-b border-[#182330] px-4 flex items-center justify-between font-mono select-none overflow-x-auto overflow-y-hidden scrollbar-none gap-4">
      {/* Left: Symbol, interval tag, OHLCV values matching screenshot */}
      <div className="flex items-center gap-3.5 whitespace-nowrap min-w-max">
        {/* Symbol with green status dot or Blind Practice banner */}
        {blindPractice?.isActive ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-purple-600/25 to-rose-500/20 border border-amber-500/40 text-amber-200 font-bold text-xs shadow-sm">
              <Swords className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>
                {blindPractice.isRevealed 
                  ? `进阶练剑 ·【${blindPractice.realSymbol}】` 
                  : `进阶练剑 · ${blindPractice.aliasName}`}
              </span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-normal font-sans ${
                blindPractice.isRevealed 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {blindPractice.isRevealed ? '已揭晓' : '未知盲测'}
              </span>
            </div>

            {onToggleBlindReveal && (
              <button
                type="button"
                onClick={onToggleBlindReveal}
                title={blindPractice.isRevealed ? '点击重新隐藏币对名称以保持客观' : '回测完成？点击揭晓本次盲测的真实币对名称'}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-[#131d2a] hover:bg-[#1b293b] text-slate-300 hover:text-white border border-[#203247] transition-all cursor-pointer shadow-sm"
              >
                {blindPractice.isRevealed ? (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>重新隐藏</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>揭晓真实币对</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#00C087] shadow-[0_0_8px_#00c087]"></span>
            <span>{symbol}</span>
          </div>
        )}

        {/* Interval Pill Tag */}
        <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/50 text-[11px] font-semibold">
          {intervalLabel}
        </span>

        {/* Feature K Gold Indicator Badge */}
        {isFeatureK && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
            <span>特征K{featureKName ? ` · ${featureKName}` : ''}</span>
          </span>
        )}

        {/* In-progress bar badge if incomplete */}
        {activeCandle.isClosed === false && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>生成中 {activeCandle.progressText ? `(${activeCandle.progressText})` : ''} · 严防未来数据泄露</span>
          </span>
        )}

        {/* Timestamp with Year */}
        <span className="text-slate-400 text-xs mr-1">
          时间: <span className="text-slate-200 font-medium">{formattedTime}</span>
        </span>

        {/* Highlighted OHLCV + Change + Turnover Section (2x size: 24px) */}
        <div className="flex items-center gap-4 text-[24px] font-mono tracking-tight whitespace-nowrap leading-none">
          {/* Open */}
          <span className="text-slate-400">
            开: <span className="text-slate-100 font-bold">{formatPrice(activeCandle.open)}</span>
          </span>

          {/* High */}
          <span className="text-slate-400">
            高: <span className="text-[#00C087] font-bold">{formatPrice(activeCandle.high)}</span>
          </span>

          {/* Low */}
          <span className="text-slate-400">
            低: <span className="text-[#F6465D] font-bold">{formatPrice(activeCandle.low)}</span>
          </span>

          {/* Close */}
          <span className="text-slate-400">
            收: <span className={`font-bold ${isUp ? 'text-[#00C087]' : 'text-[#F6465D]'}`}>{formatPrice(activeCandle.close)}</span>
          </span>

          {/* Change Pct */}
          <span className="text-slate-400">
            涨跌: <span className={`font-bold ${isChangePositive ? 'text-[#00C087]' : 'text-[#F6465D]'}`}>
              {isChangePositive ? `+${activeCandle.changePct.toFixed(2)}%` : `${activeCandle.changePct.toFixed(2)}%`}
            </span>
          </span>

          {/* Amplitude Pct */}
          <span className="text-slate-400">
            振幅: <span className="text-amber-400 font-bold">{activeCandle.amplitudePct.toFixed(2)}%</span>
          </span>

          {/* Turnover */}
          <span className="text-slate-400">
            成交额: <span className="text-cyan-400 font-bold">{formattedTurnover}</span>
          </span>
        </div>
      </div>

      {/* Right: MA Legends & Chart View Tools */}
      <div className="flex items-center gap-4 whitespace-nowrap min-w-max">
        {/* MA Indicators */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <span className="w-3 h-0.5 bg-amber-400 inline-block"></span>
            MA7{activeCandle.ma7 ? `: ${formatPrice(activeCandle.ma7)}` : ''}
          </span>
          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
            MA25{activeCandle.ma25 ? `: ${formatPrice(activeCandle.ma25)}` : ''}
          </span>
          <span className="flex items-center gap-1 text-purple-400 font-semibold">
            <span className="w-3 h-0.5 bg-purple-400 inline-block"></span>
            MA99{activeCandle.ma99 ? `: ${formatPrice(activeCandle.ma99)}` : ''}
          </span>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-1.5 text-slate-400 pl-2 border-l border-[#1f2e40]">
          <button
            onClick={onResetView}
            title="K线全屏自适应展示 (Auto-Fit)"
            className="px-2 py-0.5 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-[#162332] rounded transition-colors flex items-center gap-1 border border-[#1f2e40]"
          >
            <Maximize2 className="w-3 h-3" />
            <span>自适应</span>
          </button>
          <button
            onClick={onZoomIn}
            title="放大K线 (Zoom In)"
            className="p-1 hover:text-slate-100 hover:bg-[#162332] rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            title="缩小K线 (Zoom Out)"
            className="p-1 hover:text-slate-100 hover:bg-[#162332] rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenSearch}
            title="筛选特征K"
            className="p-1 hover:text-slate-100 hover:bg-[#162332] rounded transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetView}
            title="重置缩放与视角"
            className="p-1 hover:text-slate-100 hover:bg-[#162332] rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

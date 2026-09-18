import React from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  Database,
  Sliders,
  BarChart3,
  Loader2,
  Lock
} from 'lucide-react';
import { TimeframeInterval, MarketSyncState } from '../types/market';
import { INTERVAL_LABELS } from '../utils/resampler';

interface TopNavigationBarProps {
  currentInterval: TimeframeInterval;
  baseInterval: string;
  onSelectInterval: (interval: TimeframeInterval) => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onOpenFeatureK: () => void;
  onReset: () => void;
  onOpenDataModal: () => void;
  activeBottomTab: 'trade' | 'backtest' | 'none';
  onToggleBottomTab: (tab: 'trade' | 'backtest') => void;
  syncState?: MarketSyncState;
  includeIncompleteBar?: boolean;
  onToggleIncompleteBar?: (val: boolean) => void;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  currentInterval,
  baseInterval,
  onSelectInterval,
  isRunning,
  onTogglePlay,
  onStepForward,
  onOpenFeatureK,
  onReset,
  onOpenDataModal,
  activeBottomTab,
  onToggleBottomTab,
  syncState,
  includeIncompleteBar = true,
  onToggleIncompleteBar,
}) => {
  const isSyncing = syncState?.status === 'SYNCING';
  const quickIntervals: { key: TimeframeInterval; label: string }[] = [
    { key: '15m', label: '15分钟' },
    { key: '1h', label: '1小时' },
    { key: '4h', label: '4小时' },
    { key: '1d', label: '日线' },
    { key: 'raw', label: '原始周期' },
  ];

  return (
    <header className="h-14 bg-[#0a1017] border-b border-[#1c2936] px-4 flex items-center justify-between gap-3 select-none">
      {/* Left: K-line aggregation timeframe selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">K线尺度聚合:</span>
        </div>

        <div className="flex items-center bg-[#111923] p-0.5 rounded-lg border border-[#1e2c3a]">
          {quickIntervals.map((item) => {
            const isActive = currentInterval === item.key;
            return (
              <button
                key={item.key}
                id={`btn-interval-${item.key}`}
                onClick={() => onSelectInterval(item.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-[#00c087]/15 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#182433]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {baseInterval && baseInterval !== 'raw' && (
          <span className="hidden md:inline-flex text-[11px] text-slate-500 bg-[#121c27] px-2 py-0.5 rounded border border-[#1b2837]">
            基底: {INTERVAL_LABELS[baseInterval] || baseInterval}
          </span>
        )}

        {/* Anti-leakage / Multi-timeframe bar toggle */}
        <button
          id="btn-anti-leakage-mode"
          onClick={() => onToggleIncompleteBar?.(!includeIncompleteBar)}
          title={
            includeIncompleteBar
              ? "防未来数据泄露【动态合成】：大周期未走满时仅聚合已过去的K线，绝不呈现未发生的未来行情。点击切换为【仅已收盘】"
              : "防未来数据泄露【仅已收盘】：大周期未走满时直接隐藏，完全走满后才呈现。点击切换为【动态合成】"
          }
          className={`hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
            includeIncompleteBar
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/50'
              : 'bg-indigo-950/50 text-indigo-300 border-indigo-500/50 hover:bg-indigo-900/50'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${includeIncompleteBar ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
          <span>防泄露: {includeIncompleteBar ? '动态合成' : '仅已收盘'}</span>
        </button>

        {isSyncing && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>全量同步中: {syncState.fetchedCount.toLocaleString()} 根</span>
          </div>
        )}
      </div>

      {/* Right: Controls matching screenshot */}
      <div className="flex items-center gap-2">
        {/* START / PAUSE backtest button */}
        <button
          id="btn-start-backtest"
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-md cursor-pointer ${
            isSyncing
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 shadow-amber-500/10'
              : isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-[#00C087] hover:bg-[#00db9a] text-slate-950 shadow-[#00c087]/25 hover:shadow-[#00c087]/40'
          }`}
        >
          {isSyncing ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>同步中 (回测锁定)</span>
            </>
          ) : isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>暂停 (PAUSE)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>开始回测 (START)</span>
            </>
          )}
        </button>

        {/* Step +1 */}
        <button
          id="btn-step-forward"
          onClick={onStepForward}
          disabled={isRunning || isSyncing}
          title={isSyncing ? '行情同步中，回测锁定' : '步进一根K线'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#131d2a] hover:bg-[#1a2738] text-slate-300 border border-[#223347] disabled:opacity-50 transition-colors cursor-pointer"
        >
          <StepForward className="w-3.5 h-3.5" />
          <span>步进+1</span>
        </button>

        {/* Jump to Feature K */}
        <button
          id="btn-jump-feature-k"
          onClick={onOpenFeatureK}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1a1c22] hover:bg-[#252831] text-amber-300 border border-amber-500/30 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>跳至特征K</span>
        </button>

        {/* Data Source & Import */}
        <button
          id="btn-open-data-modal"
          onClick={onOpenDataModal}
          title="币安在线获取 / 本地表格导入"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#131d2a] hover:bg-[#1a2738] text-cyan-300 border border-cyan-500/30 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">行情数据</span>
        </button>

        {/* Trade Execution Panel Toggle */}
        <button
          id="btn-toggle-trade-tab"
          onClick={() => onToggleBottomTab('trade')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            activeBottomTab === 'trade'
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
              : 'bg-[#131d2a] hover:bg-[#1a2738] text-slate-300 border-[#223347]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">合约交易</span>
        </button>

        {/* Backtest Statistics Toggle */}
        <button
          id="btn-toggle-backtest-tab"
          onClick={() => onToggleBottomTab('backtest')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            activeBottomTab === 'backtest'
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
              : 'bg-[#131d2a] hover:bg-[#1a2738] text-slate-300 border-[#223347]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">回测统计</span>
        </button>

        {/* Reset */}
        <button
          id="btn-reset-backtest"
          onClick={onReset}
          title="重置回测到初始状态"
          className="p-1.5 rounded-md bg-[#131d2a] hover:bg-[#1a2738] text-slate-400 hover:text-slate-200 border border-[#223347] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

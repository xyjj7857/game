import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Award, 
  Flame, 
  History,
  Download,
  Trash2,
  Gauge
} from 'lucide-react';
import { BacktestState, TradeRecord } from '../types/market';
import { formatExactPrice } from '../utils/formatters';

interface BacktestDashboardProps {
  backtestState: BacktestState;
  onSetSpeed: (speedMs: number) => void;
  onClearTrades: () => void;
}

export const BacktestDashboard: React.FC<BacktestDashboardProps> = ({
  backtestState,
  onSetSpeed,
  onClearTrades,
}) => {
  const { initialBalance, equity, currentBalance, trades, currentIndex, totalCandles, playbackSpeedMs } = backtestState;

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);

  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const netProfit = equity - initialBalance;
  const netProfitPct = (netProfit / initialBalance) * 100;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';

  // Calculate Max Drawdown
  let peakEquity = initialBalance;
  let maxDd = 0;
  backtestState.equityHistory.forEach((h) => {
    if (h.equity > peakEquity) peakEquity = h.equity;
    const dd = peakEquity > 0 ? ((peakEquity - h.equity) / peakEquity) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  });

  const speedOptions = [
    { label: '0.5x 慢速', ms: 500 },
    { label: '1x 常规', ms: 250 },
    { label: '2x 快速', ms: 120 },
    { label: '5x 极速', ms: 50 },
  ];

  const handleExportCSV = () => {
    if (trades.length === 0) return;
    const headers = ['ID,方向,杠杆,开仓价,平仓价,持仓量,收益(USDT),收益率(%),手续费,平仓原因'];
    const rows = trades.map(
      (t) =>
        `${t.id},${t.side},${t.leverage}x,${t.entryPrice},${t.exitPrice},${t.size},${t.pnl.toFixed(2)},${t.pnlPct.toFixed(2)}%,${t.fee.toFixed(2)},${t.exitReason}`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backtest_trades_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="bg-[#0b1118] border-t border-[#1c2936] p-4 select-none space-y-3">
      {/* Top Bar: Progress & Speed Controller */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>回测回放进度:</span>
          </div>
          <span className="font-mono font-bold text-slate-200">
            {currentIndex + 1} / {totalCandles} 根K线 ({totalCandles > 0 ? Math.round(((currentIndex + 1) / totalCandles) * 100) : 0}%)
          </span>
          <div className="w-32 bg-[#182637] h-2 rounded-full overflow-hidden hidden sm:block">
            <div
              className="bg-[#00C087] h-full transition-all"
              style={{ width: `${totalCandles > 0 ? ((currentIndex + 1) / totalCandles) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Speed buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] mr-1">回放速度:</span>
          {speedOptions.map((opt) => (
            <button
              key={opt.ms}
              onClick={() => onSetSpeed(opt.ms)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                playbackSpeedMs === opt.ms
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-semibold'
                  : 'bg-[#141f2c] text-slate-400 border-[#203043] hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
        <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42]">
          <span className="text-slate-400 text-[11px] block mb-0.5">当前账户净值</span>
          <span className="font-mono text-sm font-bold text-slate-100">
            {equity.toFixed(2)} <span className="text-[10px] text-slate-500">USDT</span>
          </span>
        </div>

        <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42]">
          <span className="text-slate-400 text-[11px] block mb-0.5">累计净收益</span>
          <span
            className={`font-mono text-sm font-bold ${
              netProfit >= 0 ? 'text-[#00C087]' : 'text-[#F6465D]'
            }`}
          >
            {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} ({netProfitPct >= 0 ? '+' : ''}{netProfitPct.toFixed(2)}%)
          </span>
        </div>

        <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42]">
          <span className="text-slate-400 text-[11px] block mb-0.5">胜率 (Win Rate)</span>
          <span className="font-mono text-sm font-bold text-amber-400">
            {winRate.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">({winningTrades.length}胜/{losingTrades.length}负)</span>
          </span>
        </div>

        <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42]">
          <span className="text-slate-400 text-[11px] block mb-0.5">盈亏比 (Profit Factor)</span>
          <span className="font-mono text-sm font-bold text-cyan-300">{profitFactor}</span>
        </div>

        <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42]">
          <span className="text-slate-400 text-[11px] block mb-0.5">最大动态回撤</span>
          <span className="font-mono text-sm font-bold text-rose-400">-{maxDd.toFixed(2)}%</span>
        </div>

        <div className="bg-[#0f1722] p-2.5 rounded-lg border border-[#1f2e42]">
          <span className="text-slate-400 text-[11px] block mb-0.5">总交易笔数</span>
          <span className="font-mono text-sm font-bold text-slate-200">{totalTrades} 笔</span>
        </div>
      </div>

      {/* Trade History Table */}
      <div className="bg-[#0f1722] rounded-lg p-3 border border-[#1f2e42] space-y-2">
        <div className="flex items-center justify-between text-xs border-b border-[#1c2a3b] pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <History className="w-4 h-4 text-cyan-400" />
            <span>平仓成交记录流水 ({trades.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={trades.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#162230] hover:bg-[#1f2e40] text-slate-300 text-[11px] disabled:opacity-40 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>导出CSV</span>
            </button>

            <button
              onClick={onClearTrades}
              disabled={trades.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#162230] hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-[11px] disabled:opacity-40 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>清空记录</span>
            </button>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            暂无已平仓交易记录。在回测过程中开多/开空并平仓后将自动生成详尽收益流水。
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono">
            {trades.slice().reverse().map((t) => {
              const isWin = t.pnl >= 0;
              const dateObj = new Date(t.exitTime);
              const timeStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

              return (
                <div
                  key={t.id}
                  className="bg-[#121c27] p-2 rounded flex items-center justify-between border border-[#1b2838]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.side === 'LONG' ? 'bg-[#00C087]/20 text-[#00C087]' : 'bg-[#F6465D]/20 text-[#F6465D]'
                      }`}
                    >
                      {t.side === 'LONG' ? '多头 LONG' : '空头 SHORT'} {t.leverage}x
                    </span>
                    <span className="text-slate-300">{t.symbol}</span>
                    <span className="text-slate-500">{timeStr}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">
                      进: {formatExactPrice(t.entryPrice)} → 出: {formatExactPrice(t.exitPrice)}
                    </span>
                    <span className={`font-bold ${isWin ? 'text-[#00C087]' : 'text-[#F6465D]'}`}>
                      {isWin ? '+' : ''}{t.pnl.toFixed(2)} U ({t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

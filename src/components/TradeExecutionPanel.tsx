import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  DollarSign, 
  ShieldAlert, 
  Zap, 
  ArrowRightLeft, 
  XSquare,
  Sparkles,
  Check,
  History,
  Trash2
} from 'lucide-react';
import { CalculatedCandle, Position, PositionSide, TradeConfig, TradeRecord } from '../types/market';
import { formatExactPrice } from '../utils/formatters';

interface TradeExecutionPanelProps {
  activeCandle: CalculatedCandle | null;
  accountBalance: number;
  positions: Position[];
  trades?: TradeRecord[];
  onClearTrades?: () => void;
  tradeConfig: TradeConfig;
  onUpdateTradeConfig: (config: Partial<TradeConfig>) => void;
  onOpenPosition: (
    side: PositionSide,
    margin: number,
    leverage: number,
    takeProfit?: number,
    stopLoss?: number
  ) => void;
  onClosePosition: (positionId: string) => void;
  onReversePosition: (positionId: string) => void;
  autoSignalEnabled: boolean;
  onToggleAutoSignal: (enabled: boolean) => void;
  onDirectJumpToFeatureK?: () => void;
}

export const TradeExecutionPanel: React.FC<TradeExecutionPanelProps> = ({
  activeCandle,
  accountBalance,
  positions,
  trades = [],
  onClearTrades,
  tradeConfig,
  onUpdateTradeConfig,
  onOpenPosition,
  onClosePosition,
  onReversePosition,
  autoSignalEnabled,
  onToggleAutoSignal,
  onDirectJumpToFeatureK,
}) => {
  const currentPrice = activeCandle ? activeCandle.close : 0;

  // Calculate actual margin used
  const effectiveMargin = tradeConfig.customMargin 
    ? parseFloat(tradeConfig.customMargin) || 0 
    : (accountBalance * tradeConfig.marginPercent) / 100;

  const contractSize = currentPrice > 0 
    ? ((effectiveMargin * tradeConfig.leverage) / currentPrice).toFixed(4)
    : '0';

  const totalRealizedPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  const formatExitReason = (reason: TradeRecord['exitReason']) => {
    switch (reason) {
      case 'TAKE_PROFIT': return '止盈';
      case 'STOP_LOSS': return '止损';
      case 'LIQUIDATION': return '强平';
      case 'SIGNAL': return '指标';
      case 'MANUAL': default: return '平仓';
    }
  };

  const handleOpen = (side: PositionSide) => {
    if (!activeCandle || effectiveMargin <= 0 || effectiveMargin > accountBalance) return;

    let tpPrice: number | undefined;
    let slPrice: number | undefined;

    // Custom Take Profit price takes highest precedence
    if (tradeConfig.customTpPrice) {
      const customTp = parseFloat(tradeConfig.customTpPrice);
      if (!isNaN(customTp) && customTp > 0) {
        tpPrice = customTp;
      }
    } else if (tradeConfig.tpEnabled) {
      const tpP = parseFloat(tradeConfig.tpPercent);
      if (!isNaN(tpP) && tpP > 0) {
        tpPrice = side === 'LONG' 
          ? currentPrice * (1 + tpP / 100 / tradeConfig.leverage)
          : currentPrice * (1 - tpP / 100 / tradeConfig.leverage);
      }
    }

    // Custom Stop Loss price takes highest precedence
    if (tradeConfig.customSlPrice) {
      const customSl = parseFloat(tradeConfig.customSlPrice);
      if (!isNaN(customSl) && customSl > 0) {
        slPrice = customSl;
      }
    } else if (tradeConfig.slEnabled) {
      const slP = parseFloat(tradeConfig.slPercent);
      if (!isNaN(slP) && slP > 0) {
        slPrice = side === 'LONG'
          ? currentPrice * (1 - slP / 100 / tradeConfig.leverage)
          : currentPrice * (1 + slP / 100 / tradeConfig.leverage);
      }
    }

    onOpenPosition(side, effectiveMargin, tradeConfig.leverage, tpPrice, slPrice);
  };

  return (
    <div className="bg-[#0b1118] border-t border-[#1c2936] p-4 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: Order Execution Form */}
        <div className="lg:col-span-7 bg-[#0f1722] rounded-lg p-3.5 border border-[#1f2e42] space-y-3">
          {/* Top Row: Title, Current Price & Auto-Signal Toggle (2x font) */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#1b2838] pb-2.5 gap-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-bold text-slate-100 text-[24px] tracking-wide">永续合约交易下单</span>
              <span className="text-[22px] text-slate-400 font-mono">
                当前价: <strong className="text-cyan-300 font-bold">{formatExactPrice(currentPrice)} USDT</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 直达特征k按钮 (黄色框体位置) */}
              <button
                id="btn-direct-jump-feature-k"
                onClick={onDirectJumpToFeatureK}
                className="flex items-center gap-2 px-3 py-1 rounded text-[20px] font-semibold border transition-all bg-[#15202c] hover:bg-[#1c2c3d] text-amber-300 border-amber-500/50 hover:border-amber-400 active:scale-[0.98] shadow-sm shadow-amber-500/10 cursor-pointer"
                title="点击直接步进到离当前K线最近的一根满足条件的特征K"
              >
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <span>直达特征k</span>
              </button>

              <button
                onClick={() => onToggleAutoSignal(!autoSignalEnabled)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-[20px] font-semibold border transition-all ${
                  autoSignalEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                    : 'bg-[#15202c] text-slate-400 border-[#223347] hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span>均线金叉死叉自动信号: {autoSignalEnabled ? '已开启' : '已关闭'}</span>
              </button>
            </div>
          </div>

          {/* Leverage & Margin Percent (2x font) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leverage Slider & Presets */}
            <div className="bg-[#0b121a] p-3 rounded-lg border border-[#1a293b]">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[22px] font-medium text-slate-300">杠杆倍数</span>
                <span className="font-bold text-amber-400 font-mono text-[24px]">{tradeConfig.leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={tradeConfig.leverage}
                onChange={(e) => onUpdateTradeConfig({ leverage: Number(e.target.value) })}
                className="w-full h-2 bg-[#1a2838] rounded-lg appearance-none cursor-pointer accent-cyan-400 my-1"
              />
              <div className="flex justify-between text-[20px] text-slate-400 font-mono mt-2">
                {[1, 5, 10, 20, 50].map((lev) => (
                  <button
                    key={lev}
                    onClick={() => onUpdateTradeConfig({ leverage: lev })}
                    className={`px-2 py-0.5 rounded hover:text-slate-100 transition-colors ${
                      tradeConfig.leverage === lev ? 'text-amber-400 font-bold bg-amber-500/10' : ''
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Percent Selection & Custom Margin */}
            <div className="bg-[#0b121a] p-3 rounded-lg border border-[#1a293b]">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[22px] font-medium text-slate-300">开仓保证金占用</span>
                <span className="font-bold text-cyan-300 font-mono text-[24px]">
                  {effectiveMargin.toFixed(1)} USDT
                </span>
              </div>
              <div className="flex gap-1.5">
                {[10, 25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      onUpdateTradeConfig({ marginPercent: pct, customMargin: '' });
                    }}
                    className={`flex-1 py-1.5 rounded text-[22px] font-mono font-semibold border transition-colors ${
                      tradeConfig.marginPercent === pct && !tradeConfig.customMargin
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                        : 'bg-[#141f2c] text-slate-400 border-[#203043] hover:text-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between text-[20px] text-slate-400 mt-2.5 gap-2">
                <span className="whitespace-nowrap">折合持仓: <strong className="font-mono text-slate-200">{contractSize} 张/币</strong></span>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[20px] text-slate-400">自定USDT:</span>
                  <input
                    type="number"
                    value={tradeConfig.customMargin || ''}
                    onChange={(e) => onUpdateTradeConfig({ customMargin: e.target.value })}
                    placeholder="比例"
                    className="w-24 bg-[#121c27] text-slate-100 px-2 py-0.5 rounded border border-[#1f3044] text-[20px] font-mono text-right focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TP & SL Setting with Checkbox Requirement (2x font) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Take Profit (止盈目标) - 勾选生效 */}
            <div className={`p-3 rounded-lg border transition-all ${
              tradeConfig.tpEnabled 
                ? 'bg-[#121c27] border-emerald-500/40' 
                : 'bg-[#0d141d] border-[#182432] opacity-75'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="checkbox-tp-enable"
                    checked={tradeConfig.tpEnabled}
                    onChange={(e) => onUpdateTradeConfig({ tpEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-[#2a3c50] text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-[#0e1622] cursor-pointer accent-emerald-500"
                  />
                  <span className={`text-[22px] font-bold ${tradeConfig.tpEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                    止盈目标 (勾选生效)
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  {['3', '5', '10', '20'].map((val) => (
                    <button
                      key={val}
                      onClick={() => onUpdateTradeConfig({ tpEnabled: true, tpPercent: val })}
                      className={`text-[18px] px-2 py-0.5 rounded font-mono transition-colors ${
                        tradeConfig.tpEnabled && tradeConfig.tpPercent === val
                          ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                          : 'bg-[#172230] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#0d151f] px-3 py-1.5 rounded border border-[#1a2736]">
                <span className="text-slate-300 text-[20px] whitespace-nowrap shrink-0">预期涨跌收益</span>
                <input
                  type="number"
                  disabled={!tradeConfig.tpEnabled}
                  value={tradeConfig.tpPercent}
                  onChange={(e) => onUpdateTradeConfig({ tpPercent: e.target.value })}
                  placeholder={tradeConfig.tpEnabled ? '例: 5' : '未勾选启用'}
                  className={`w-full bg-transparent font-mono text-right text-[22px] focus:outline-none ${
                    tradeConfig.tpEnabled ? 'text-emerald-300 font-bold' : 'text-slate-600 cursor-not-allowed'
                  }`}
                />
                <span className="text-slate-400 text-[20px] shrink-0 font-mono font-bold">%</span>
              </div>

              {/* 自定义止盈价输入栏 */}
              <div className="flex items-center gap-3 bg-[#0d151f] px-3 py-1.5 rounded border border-[#1a2736] mt-2">
                <span className="text-slate-300 text-[20px] whitespace-nowrap shrink-0">自定止盈价</span>
                <input
                  type="number"
                  step="any"
                  id="input-custom-tp-price"
                  value={tradeConfig.customTpPrice || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateTradeConfig({ 
                      customTpPrice: val,
                      tpEnabled: val ? true : tradeConfig.tpEnabled 
                    });
                  }}
                  placeholder="自定价格 (USDT)"
                  className="w-full bg-transparent font-mono text-right text-[22px] focus:outline-none text-emerald-300 font-bold placeholder:text-slate-600 placeholder:text-[18px]"
                />
                <span className="text-slate-400 text-[18px] shrink-0 font-mono font-semibold">USDT</span>
              </div>
            </div>

            {/* Stop Loss (止损保护) - 勾选生效 */}
            <div className={`p-3 rounded-lg border transition-all ${
              tradeConfig.slEnabled 
                ? 'bg-[#121c27] border-rose-500/40' 
                : 'bg-[#0d141d] border-[#182432] opacity-75'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="checkbox-sl-enable"
                    checked={tradeConfig.slEnabled}
                    onChange={(e) => onUpdateTradeConfig({ slEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-[#2a3c50] text-rose-500 focus:ring-0 focus:ring-offset-0 bg-[#0e1622] cursor-pointer accent-rose-500"
                  />
                  <span className={`text-[22px] font-bold ${tradeConfig.slEnabled ? 'text-rose-400' : 'text-slate-400'}`}>
                    止损保护 (勾选生效)
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  {['1', '2', '3', '5'].map((val) => (
                    <button
                      key={val}
                      onClick={() => onUpdateTradeConfig({ slEnabled: true, slPercent: val })}
                      className={`text-[18px] px-2 py-0.5 rounded font-mono transition-colors ${
                        tradeConfig.slEnabled && tradeConfig.slPercent === val
                          ? 'bg-rose-500/30 text-rose-300 font-bold border border-rose-500/50'
                          : 'bg-[#172230] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#0d151f] px-3 py-1.5 rounded border border-[#1a2736]">
                <span className="text-slate-300 text-[20px] whitespace-nowrap shrink-0">承受最大亏损</span>
                <input
                  type="number"
                  disabled={!tradeConfig.slEnabled}
                  value={tradeConfig.slPercent}
                  onChange={(e) => onUpdateTradeConfig({ slPercent: e.target.value })}
                  placeholder={tradeConfig.slEnabled ? '例: 3' : '未勾选启用'}
                  className={`w-full bg-transparent font-mono text-right text-[22px] focus:outline-none ${
                    tradeConfig.slEnabled ? 'text-rose-300 font-bold' : 'text-slate-600 cursor-not-allowed'
                  }`}
                />
                <span className="text-slate-400 text-[20px] shrink-0 font-mono font-bold">%</span>
              </div>

              {/* 自定义止损价输入栏 */}
              <div className="flex items-center gap-3 bg-[#0d151f] px-3 py-1.5 rounded border border-[#1a2736] mt-2">
                <span className="text-slate-300 text-[20px] whitespace-nowrap shrink-0">自定止损价</span>
                <input
                  type="number"
                  step="any"
                  id="input-custom-sl-price"
                  value={tradeConfig.customSlPrice || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateTradeConfig({ 
                      customSlPrice: val,
                      slEnabled: val ? true : tradeConfig.slEnabled 
                    });
                  }}
                  placeholder="自定价格 (USDT)"
                  className="w-full bg-transparent font-mono text-right text-[22px] focus:outline-none text-rose-300 font-bold placeholder:text-slate-600 placeholder:text-[18px]"
                />
                <span className="text-slate-400 text-[18px] shrink-0 font-mono font-semibold">USDT</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: LONG & SHORT */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              id="btn-trade-long"
              onClick={() => handleOpen('LONG')}
              disabled={effectiveMargin <= 0 || effectiveMargin > accountBalance}
              className="py-2.5 bg-[#00C087] hover:bg-[#00db9a] active:scale-[0.98] text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00c087]/20 disabled:opacity-40"
            >
              <TrendingUp className="w-4 h-4" />
              <span>开多 (买入做多 LONG)</span>
            </button>

            <button
              id="btn-trade-short"
              onClick={() => handleOpen('SHORT')}
              disabled={effectiveMargin <= 0 || effectiveMargin > accountBalance}
              className="py-2.5 bg-[#F6465D] hover:bg-[#ff5b72] active:scale-[0.98] text-slate-100 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f6465d]/20 disabled:opacity-40"
            >
              <TrendingDown className="w-4 h-4" />
              <span>开空 (卖出做空 SHORT)</span>
            </button>
          </div>
        </div>

        {/* Right 5 cols: Active Positions & Closed Trades Records */}
        <div className="lg:col-span-5 bg-[#0f1722] rounded-lg p-3.5 border border-[#1f2e42] flex flex-col gap-3">
          {/* Top Section: Active Positions */}
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2838] pb-2.5 mb-2 gap-2">
              <span className="font-bold text-slate-100 text-sm">
                当前持仓头寸 ({positions.length})
              </span>
              {/* Highlighted Available Capital (2x size: 22px) matching yellow box */}
              <span className="text-slate-300 font-mono text-[22px] leading-none whitespace-nowrap">
                可用资金: <strong className="text-slate-100 font-bold">{accountBalance.toFixed(2)} U</strong>
              </span>
            </div>

            {positions.length === 0 ? (
              <div className="py-3 text-center text-slate-500 text-xs bg-[#0b121a] rounded border border-[#182535]">
                当前无持仓头寸，可随时点击左侧开多/开空
              </div>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {positions.map((pos) => {
                  const isLong = pos.side === 'LONG';
                  const isProfitable = pos.unrealizedPnl >= 0;

                  return (
                    <div
                      key={pos.id}
                      className="bg-[#131d2a] p-2.5 rounded-lg border border-[#1f3044] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isLong ? 'bg-[#00C087]/20 text-[#00C087]' : 'bg-[#F6465D]/20 text-[#F6465D]'
                            }`}
                          >
                            {isLong ? '多头 LONG' : '空头 SHORT'} {pos.leverage}x
                          </span>
                          <span className="text-slate-200">{pos.symbol}</span>
                        </div>

                        <div className="font-mono text-right">
                          <span
                            className={`font-bold text-xs ${
                              isProfitable ? 'text-[#00C087]' : 'text-[#F6465D]'
                            }`}
                          >
                            {isProfitable ? '+' : ''}{pos.unrealizedPnl.toFixed(2)} U ({pos.unrealizedPnlPct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 font-mono">
                        <div>
                          <span>开仓价: </span>
                          <span className="text-slate-200">{formatExactPrice(pos.entryPrice)}</span>
                        </div>
                        <div>
                          <span>强平价: </span>
                          <span className="text-rose-400">{formatExactPrice(pos.liquidationPrice)}</span>
                        </div>
                        <div>
                          <span>保证金: </span>
                          <span className="text-slate-200">{pos.margin.toFixed(1)}U</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="flex-1 py-1 bg-[#1a2636] hover:bg-rose-950 hover:text-rose-300 text-slate-300 rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <XSquare className="w-3 h-3" />
                          <span>一键平仓</span>
                        </button>
                        <button
                          onClick={() => onReversePosition(pos.id)}
                          className="flex-1 py-1 bg-[#1a2636] hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>一键反手</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Section (Matching Screenshot Red Box): Closed Trade Records (平仓成交记录) */}
          <div className="pt-2 border-t border-[#1b2838] flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 mb-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-100 text-xs sm:text-sm">
                <History className="w-4 h-4 text-cyan-400" />
                <span>平仓成交记录 ({trades.length})</span>
              </div>

              <div className="flex items-center gap-2">
                {trades.length > 0 && (
                  <span className="text-[11px] font-mono text-slate-400">
                    累计已结: <strong className={totalRealizedPnl >= 0 ? 'text-[#00C087]' : 'text-[#F6465D]'}>
                      {totalRealizedPnl >= 0 ? '+' : ''}{totalRealizedPnl.toFixed(2)} U
                    </strong>
                  </span>
                )}
                {onClearTrades && trades.length > 0 && (
                  <button
                    onClick={onClearTrades}
                    title="清空记录 (每次重置回测亦会自动清空)"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#162230] hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-[10px] transition-colors"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>清空</span>
                  </button>
                )}
              </div>
            </div>

            {trades.length === 0 ? (
              <div className="flex-1 min-h-[90px] flex flex-col items-center justify-center py-4 text-center text-slate-500 text-xs bg-[#0b121a] rounded border border-[#182535]">
                <span>暂无平仓单记录</span>
                <span className="text-[11px] text-slate-600 mt-1">平仓或触发止盈/止损后自动在此归档，每次重置回测自动清空</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {trades.slice().reverse().map((trade) => {
                  const isLong = trade.side === 'LONG';
                  const isWin = trade.pnl >= 0;
                  const dateObj = new Date(trade.exitTime);
                  const timeStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

                  return (
                    <div
                      key={trade.id}
                      className="bg-[#121c27] p-2 rounded border border-[#1b2838] flex items-center justify-between text-xs font-mono hover:border-[#25394e] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isLong ? 'bg-[#00C087]/20 text-[#00C087]' : 'bg-[#F6465D]/20 text-[#F6465D]'
                          }`}
                        >
                          {isLong ? '多头' : '空头'} {trade.leverage}x
                        </span>
                        <span className="text-slate-300 font-sans font-medium text-[11px]">{trade.symbol}</span>
                        <span className="text-slate-500 text-[10px]">{timeStr}</span>
                        <span className="text-[10px] text-slate-400 px-1 py-0.2 rounded bg-[#182637]">
                          {formatExitReason(trade.exitReason)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[10px] hidden sm:inline">
                          进: {formatExactPrice(trade.entryPrice)} → 出: {formatExactPrice(trade.exitPrice)}
                        </span>
                        <span className={`font-bold ${isWin ? 'text-[#00C087]' : 'text-[#F6465D]'}`}>
                          {isWin ? '+' : ''}{trade.pnl.toFixed(2)} U ({trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

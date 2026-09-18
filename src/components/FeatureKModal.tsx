import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowRight,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Sliders,
  Filter,
  BarChart2,
  Flame,
} from 'lucide-react';
import { CalculatedCandle, FeatureKEvent, FeatureKSettings } from '../types/market';
import { formatExactPrice } from '../utils/formatters';
import { detectFeatureKEvents, detectCustomFeatureKEvents } from '../utils/indicators';

export const FEATURE_K_STORAGE_KEY = 'kline_feature_k_settings_v2';
const STORAGE_KEY = FEATURE_K_STORAGE_KEY;

export const DEFAULT_FEATURE_K_SETTINGS: FeatureKSettings = {
  enableSmart: false,
  enableCustom: true,
  customConfig: {
    minTurnover: 8000000,
    enableGain: true,
    gainThreshold: 10,
    enableDrop: true,
    dropThreshold: 10,
    enableAmplitude: true,
    amplitudeThreshold: 15,
    enableVolSurge1: true,
    volSurge1Ratio: 2,
    enableVolSurge2: true,
    volSurge2Lookback: 5,
    volSurge2Ratio: 5,
  },
};
const DEFAULT_SETTINGS = DEFAULT_FEATURE_K_SETTINGS;

interface FeatureKModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles: CalculatedCandle[];
  currentInterval: string;
  onJumpToEvent: (event: FeatureKEvent) => void;
  settings?: FeatureKSettings;
  onUpdateSettings?: (settings: FeatureKSettings) => void;
}

export const FeatureKModal: React.FC<FeatureKModalProps> = ({
  isOpen,
  onClose,
  candles,
  currentInterval,
  onJumpToEvent,
  settings: propSettings,
  onUpdateSettings,
}) => {
  // Load permanently saved settings from localStorage as fallback
  const [localSettings, setLocalSettings] = useState<FeatureKSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
      console.error('Failed to load custom Feature K settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const settings = propSettings || localSettings;

  // Result filter view tab: 'all' | 'smart' | 'custom'
  const [filterTab, setFilterTab] = useState<'all' | 'smart' | 'custom'>('all');
  // Sort order: 'asc' (chronological #1 -> #N) | 'desc' (latest #N -> #1)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper to persist updates permanently
  const updateSettings = (updater: (prev: FeatureKSettings) => FeatureKSettings) => {
    const next = updater(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save custom Feature K settings to localStorage:', e);
    }
    if (onUpdateSettings) {
      onUpdateSettings(next);
    } else {
      setLocalSettings(next);
    }
  };

  // 1. Detect Smart Feature K events
  const smartEvents = useMemo(() => {
    if (!settings.enableSmart || !candles || candles.length === 0) return [];
    return detectFeatureKEvents(candles);
  }, [settings.enableSmart, candles]);

  // 2. Detect Custom Feature K events in active timeframe
  const customEvents = useMemo(() => {
    if (!settings.enableCustom || !candles || candles.length === 0) return [];
    return detectCustomFeatureKEvents(candles, settings.customConfig);
  }, [settings.enableCustom, settings.customConfig, candles]);

  // 3. Combined & sorted result list
  const combinedEvents = useMemo(() => {
    const list: FeatureKEvent[] = [];
    if (settings.enableSmart) {
      list.push(...smartEvents);
    }
    if (settings.enableCustom) {
      list.push(...customEvents);
    }

    // Filter by tab
    let filtered = list;
    if (filterTab === 'smart') {
      filtered = list.filter((e) => e.category === 'smart');
    } else if (filterTab === 'custom') {
      filtered = list.filter((e) => e.category === 'custom');
    }

    // Sort order
    return filtered.sort((a, b) => (sortOrder === 'asc' ? a.index - b.index : b.index - a.index));
  }, [smartEvents, customEvents, settings.enableSmart, settings.enableCustom, filterTab, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0b121b] border border-[#203144] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 1. Modal Header */}
        <div className="px-5 py-3.5 bg-[#080d14] border-b border-[#1b293a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">跳至特征K线检索</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-700/40">
                  当前周期: {currentInterval}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                支持智能算法形态识别与用户自定义量化指标（设置自动永久保存）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#152232] rounded-lg transition-colors"
            title="关闭窗口"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Control Panels: Smart Detection & Custom Feature K */}
        <div className="p-4 space-y-3 bg-[#0a1018] border-b border-[#1b293a] text-xs">
          {/* Section A: 智能特征K线识别检索板块 (勾选生效) */}
          <div
            className={`border rounded-lg p-3 transition-colors ${
              settings.enableSmart
                ? 'bg-[#0e1724] border-[#22354a]'
                : 'bg-[#0a1017]/60 border-[#182535] opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.enableSmart}
                  onChange={(e) => updateSettings((s) => ({ ...s, enableSmart: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 bg-[#162230] border-[#2c3e53] focus:ring-amber-500 cursor-pointer accent-amber-500"
                />
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    智能特征K线识别检索
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      settings.enableSmart
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {settings.enableSmart ? '✓ 勾选生效中' : '未勾选 (已停用)'}
                  </span>
                </div>
              </label>

              {settings.enableSmart && (
                <span className="text-[11px] text-amber-300/90 font-mono font-semibold">
                  共识别 {smartEvents.length} 处
                </span>
              )}
            </div>

            {settings.enableSmart && (
              <p className="text-[11px] text-slate-400 mt-2 pl-6">
                包含模式：大阳线（涨幅≥2.5%）、大阴线（跌幅≥2.5%）、天量异动（量能≥2.8x均量）、长影线探底/冲高、MA7与MA25金叉/死叉。
              </p>
            )}
          </div>

          {/* Section B: 定制特征K线板块 (用户定制涨幅、跌幅、振幅；永久保存生效；勾选生效) */}
          <div
            className={`border rounded-lg p-3 transition-colors ${
              settings.enableCustom
                ? 'bg-[#0e1724] border-cyan-800/50 shadow-sm'
                : 'bg-[#0a1017]/60 border-[#182535] opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.enableCustom}
                  onChange={(e) => updateSettings((s) => ({ ...s, enableCustom: e.target.checked }))}
                  className="w-4 h-4 rounded text-cyan-500 bg-[#162230] border-[#2c3e53] focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                />
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    定制特征K线板块
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      settings.enableCustom
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {settings.enableCustom ? '✓ 勾选生效中' : '未勾选 (已停用)'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    (当前周期: <span className="text-cyan-300 font-semibold">{currentInterval}</span>)
                  </span>
                </div>
              </label>

              <div className="flex items-center gap-2">
                {settings.enableCustom && (
                  <span className="text-[11px] text-cyan-300 font-mono font-semibold">
                    已匹配 {customEvents.length} 处
                  </span>
                )}
                <button
                  onClick={() =>
                    updateSettings((s) => ({
                      ...s,
                      customConfig: {
                        minTurnover: 8000000,
                        enableGain: true,
                        gainThreshold: 10,
                        enableDrop: true,
                        dropThreshold: 10,
                        enableAmplitude: true,
                        amplitudeThreshold: 15,
                        enableVolSurge1: true,
                        volSurge1Ratio: 2,
                        enableVolSurge2: true,
                        volSurge2Lookback: 5,
                        volSurge2Ratio: 5,
                      },
                    }))
                  }
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#182637] transition-colors"
                  title="恢复默认数值"
                >
                  <RotateCcw className="w-3 h-3" />
                  重置
                </button>
              </div>
            </div>

            {/* Custom Inputs Panel: 价格变动与量能异动 */}
            <div className="mt-3 pl-6 space-y-2.5">
              {/* 全局条件: 最小成交额 (Required) */}
              <div className="bg-[#121c29] border border-[#1e2f42] rounded-md p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    全局条件: 成交额底线 (必填)
                  </label>
                  <span className="text-[10px] text-amber-400/90 font-mono">≥ 设定值 (USDT)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">≥</span>
                  <input
                    type="number"
                    step="10000"
                    value={settings.customConfig.minTurnover}
                    onChange={(e) =>
                      updateSettings((s) => ({
                        ...s,
                        customConfig: { ...s.customConfig, minTurnover: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full bg-[#090f17] border border-[#293d54] rounded px-2 py-1 text-[12px] font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="例如: 8000000"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">USDT</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  *所有进入「定制特征」筛选的K线，其成交额必须大于或等于此数值，才会进行后续涨跌幅和异动筛选。
                </div>
              </div>

              {/* Row 1: 价格波动类 (涨幅、跌幅、振幅) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. 涨幅定制 */}
                <div className="bg-[#121c29] border border-[#1e2f42] rounded-md p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold text-[11px]">
                      <input
                        type="checkbox"
                        checked={settings.customConfig.enableGain}
                        onChange={(e) =>
                          updateSettings((s) => ({
                            ...s,
                            customConfig: { ...s.customConfig, enableGain: e.target.checked },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-emerald-500 bg-[#090f17] border-[#293d54] cursor-pointer accent-emerald-500"
                      />
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      涨幅 (Gain)
                    </label>
                    <span className="text-[10px] text-emerald-400/90 font-mono">≥ 设定值</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">≥</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settings.customConfig.gainThreshold}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateSettings((s) => ({
                          ...s,
                          customConfig: { ...s.customConfig, gainThreshold: val },
                        }));
                      }}
                      disabled={!settings.enableCustom || !settings.customConfig.enableGain}
                      className="w-full bg-[#0a1018] border border-[#233549] focus:border-emerald-500 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-slate-400 text-xs font-mono">%</span>
                  </div>
                </div>

                {/* 2. 跌幅定制 */}
                <div className="bg-[#121c29] border border-[#1e2f42] rounded-md p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold text-[11px]">
                      <input
                        type="checkbox"
                        checked={settings.customConfig.enableDrop}
                        onChange={(e) =>
                          updateSettings((s) => ({
                            ...s,
                            customConfig: { ...s.customConfig, enableDrop: e.target.checked },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-rose-500 bg-[#090f17] border-[#293d54] cursor-pointer accent-rose-500"
                      />
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                      跌幅 (Drop)
                    </label>
                    <span className="text-[10px] text-rose-400/90 font-mono">≥ 设定值</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">≥</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settings.customConfig.dropThreshold}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateSettings((s) => ({
                          ...s,
                          customConfig: { ...s.customConfig, dropThreshold: val },
                        }));
                      }}
                      disabled={!settings.enableCustom || !settings.customConfig.enableDrop}
                      className="w-full bg-[#0a1018] border border-[#233549] focus:border-rose-500 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-slate-400 text-xs font-mono">%</span>
                  </div>
                </div>

                {/* 3. 振幅定制 */}
                <div className="bg-[#121c29] border border-[#1e2f42] rounded-md p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold text-[11px]">
                      <input
                        type="checkbox"
                        checked={settings.customConfig.enableAmplitude}
                        onChange={(e) =>
                          updateSettings((s) => ({
                            ...s,
                            customConfig: { ...s.customConfig, enableAmplitude: e.target.checked },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-amber-500 bg-[#090f17] border-[#293d54] cursor-pointer accent-amber-500"
                      />
                      <Zap className="w-3 h-3 text-amber-400" />
                      振幅 (Amplitude)
                    </label>
                    <span className="text-[10px] text-amber-400/90 font-mono">≥ 设定值</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">≥</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settings.customConfig.amplitudeThreshold}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateSettings((s) => ({
                          ...s,
                          customConfig: { ...s.customConfig, amplitudeThreshold: val },
                        }));
                      }}
                      disabled={!settings.enableCustom || !settings.customConfig.enableAmplitude}
                      className="w-full bg-[#0a1018] border border-[#233549] focus:border-amber-500 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-slate-400 text-xs font-mono">%</span>
                  </div>
                </div>
              </div>

              {/* Row 2: 量能变动类 (放量1、放量2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 4. 放量1: 最新K线成交额是上一根K线的 a 倍 (勾选生效) */}
                <div
                  className={`border rounded-md p-2 flex flex-col justify-between transition-colors ${
                    settings.customConfig.enableVolSurge1
                      ? 'bg-[#101c2a] border-cyan-700/60'
                      : 'bg-[#121c29] border-[#1e2f42]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold text-[11px]">
                      <input
                        type="checkbox"
                        checked={settings.customConfig.enableVolSurge1}
                        onChange={(e) =>
                          updateSettings((s) => ({
                            ...s,
                            customConfig: { ...s.customConfig, enableVolSurge1: e.target.checked },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-cyan-500 bg-[#090f17] border-[#293d54] cursor-pointer accent-cyan-500"
                      />
                      <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                      放量1 (上一根 a 倍)
                    </label>
                    <span className="text-[10px] text-cyan-400/90 font-mono">最新成交额 ≥ 上根 a 倍</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 shrink-0">成交额 ≥ 上一根的</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={settings.customConfig.volSurge1Ratio}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateSettings((s) => ({
                          ...s,
                          customConfig: { ...s.customConfig, volSurge1Ratio: val },
                        }));
                      }}
                      disabled={!settings.enableCustom || !settings.customConfig.enableVolSurge1}
                      className="w-full bg-[#0a1018] border border-[#233549] focus:border-cyan-500 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-cyan-400 text-xs font-mono font-semibold shrink-0">倍 (a)</span>
                  </div>
                </div>

                {/* 5. 放量2: 最新K线成交额是前 x 根K线中最低成交额的 y 倍 (勾选生效) */}
                <div
                  className={`border rounded-md p-2 flex flex-col justify-between transition-colors ${
                    settings.customConfig.enableVolSurge2
                      ? 'bg-[#141829] border-violet-700/60'
                      : 'bg-[#121c29] border-[#1e2f42]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold text-[11px]">
                      <input
                        type="checkbox"
                        checked={settings.customConfig.enableVolSurge2}
                        onChange={(e) =>
                          updateSettings((s) => ({
                            ...s,
                            customConfig: { ...s.customConfig, enableVolSurge2: e.target.checked },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-violet-500 bg-[#090f17] border-[#293d54] cursor-pointer accent-violet-500"
                      />
                      <Flame className="w-3.5 h-3.5 text-violet-400" />
                      放量2 (前 x 根最低 y 倍)
                    </label>
                    <span className="text-[10px] text-violet-400/90 font-mono">最新成交额 ≥ 前x根最低 y 倍</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 shrink-0">前</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={settings.customConfig.volSurge2Lookback}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        updateSettings((s) => ({
                          ...s,
                          customConfig: { ...s.customConfig, volSurge2Lookback: val },
                        }));
                      }}
                      disabled={!settings.enableCustom || !settings.customConfig.enableVolSurge2}
                      className="w-14 bg-[#0a1018] border border-[#233549] focus:border-violet-500 rounded px-1.5 py-1 text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40 text-center"
                    />
                    <span className="text-[11px] text-slate-400 shrink-0">根最低的</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={settings.customConfig.volSurge2Ratio}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateSettings((s) => ({
                          ...s,
                          customConfig: { ...s.customConfig, volSurge2Ratio: val },
                        }));
                      }}
                      disabled={!settings.enableCustom || !settings.customConfig.enableVolSurge2}
                      className="w-full bg-[#0a1018] border border-[#233549] focus:border-violet-500 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-violet-400 text-xs font-mono font-semibold shrink-0">倍 (y)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pl-6 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400/80">
                <Check className="w-3.5 h-3.5" />
                设置已自动永久保存在本地，即刻生效。
              </span>
              <span>
                当前全量 K 线: <span className="font-mono text-slate-200 font-semibold">{candles.length.toLocaleString()}</span> 根
              </span>
            </div>
          </div>
        </div>

        {/* 3. Search Results Toolbar (Tabs & Sort) */}
        <div className="px-5 py-2.5 bg-[#090e15] border-b border-[#1b293a] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" />
              展示筛选:
            </span>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                filterTab === 'all'
                  ? 'bg-slate-700 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#15202d]'
              }`}
            >
              全部 ({settings.enableSmart && settings.enableCustom ? smartEvents.length + customEvents.length : combinedEvents.length})
            </button>
            {settings.enableSmart && (
              <button
                onClick={() => setFilterTab('smart')}
                className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                  filterTab === 'smart'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-[#15202d]'
                }`}
              >
                智能识别 ({smartEvents.length})
              </button>
            )}
            {settings.enableCustom && (
              <button
                onClick={() => setFilterTab('custom')}
                className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                  filterTab === 'custom'
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-[#15202d]'
                }`}
              >
                定制特征 ({customEvents.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-[#131c28] border border-[#202e3f] transition-colors"
            >
              排序: {sortOrder === 'asc' ? '时间正序 (#1 → #N)' : '时间倒序 (最新优先)'}
            </button>
          </div>
        </div>

        {/* 4. Results List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
          {!settings.enableSmart && !settings.enableCustom ? (
            <div className="py-14 text-center text-slate-400">
              <Sliders className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">暂无已启用的检索板块</p>
              <p className="text-[11px] text-slate-500 mt-1">
                请至少勾选「智能特征K线识别检索」或「定制特征K线板块」以查看匹配结果
              </p>
            </div>
          ) : combinedEvents.length === 0 ? (
            <div className="py-14 text-center text-slate-500">
              <p>在当前 {currentInterval} 周期（共 {candles.length.toLocaleString()} 根K线）中未匹配到特征K线</p>
              <p className="text-[11px] text-slate-600 mt-1">
                可尝试在上方适当放宽定制涨幅、跌幅或振幅阈值
              </p>
            </div>
          ) : (
            combinedEvents.map((evt, idx) => {
              const dateObj = new Date(evt.timestamp);
              const timeStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(
                dateObj.getDate()
              ).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(
                dateObj.getMinutes()
              ).padStart(2, '0')}`;
              const isUp = evt.changePct >= 0;
              const isCustom = evt.category === 'custom';

              return (
                <div
                  key={`${evt.index}-${evt.category}-${idx}`}
                  onClick={() => {
                    onJumpToEvent(evt);
                    onClose();
                  }}
                  className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer transition-all group ${
                    isCustom
                      ? 'bg-[#101925] hover:bg-[#162335] border-[#1e2f44] hover:border-cyan-500/60'
                      : 'bg-[#121c27] hover:bg-[#182535] border-[#1f2e42] hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[#0a1017] border border-[#1a2736]">
                      {isCustom ? (
                        isUp ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-rose-400" />
                        )
                      ) : evt.type === 'BULLISH_SURGE' || evt.type === 'MA_GOLDEN_CROSS' ? (
                        <TrendingUp className="w-4 h-4 text-[#00C087]" />
                      ) : evt.type === 'BEARISH_PLUNGE' || evt.type === 'MA_DEATH_CROSS' ? (
                        <TrendingDown className="w-4 h-4 text-[#F6465D]" />
                      ) : (
                        <Zap className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold transition-colors ${
                            isCustom
                              ? 'text-cyan-200 group-hover:text-cyan-300'
                              : 'text-slate-100 group-hover:text-amber-300'
                          }`}
                        >
                          {evt.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            isCustom
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                          }`}
                        >
                          {isCustom ? '定制特征' : '智能识别'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          序号 #{evt.index}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {evt.description} · 收盘价: <span className="font-mono text-slate-200">{formatExactPrice(evt.price)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <span className="text-[11px] text-slate-400 block">{timeStr}</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`text-xs font-semibold ${
                            isUp ? 'text-[#00C087]' : 'text-[#F6465D]'
                          }`}
                        >
                          {isUp ? `+${evt.changePct.toFixed(2)}%` : `${evt.changePct.toFixed(2)}%`}
                        </span>
                        {evt.amplitudePct !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            (振 {evt.amplitudePct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 transition-colors ${
                        isCustom
                          ? 'text-slate-500 group-hover:text-cyan-400'
                          : 'text-slate-500 group-hover:text-amber-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Globe, 
  UploadCloud, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileSpreadsheet, 
  Activity,
  ArrowRight,
  Database,
  Search,
  Flame,
  Bot,
  Zap,
  Coins,
  Gamepad2,
  Check,
  Swords,
  Settings
} from 'lucide-react';
import { Candle, CooldownStatus, MarketSyncState } from '../types/market';
import { binanceCooldown, fetchBinanceKlines, fetchAllBinanceKlines, normalizeBinanceSymbol, loadLiveBinanceFuturesSymbols } from '../utils/binanceApi';
import { SymbolMetadata, searchBinanceSymbols, PRELOADED_FUTURES_SYMBOLS } from '../utils/binanceSymbols';
import { parseFileToCandles, ParseResult, ColumnMapping } from '../utils/fileParser';
import { generateSampleBTC15m } from '../utils/sampleData';
import { INTERVAL_LABELS } from '../utils/resampler';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (candles: Candle[], symbol: string, interval: string) => void;
  currentSymbol: string;
  syncState?: MarketSyncState;
  onStartOnlineSync?: (
    symbol: string, 
    interval: string, 
    marketType: 'futures' | 'spot', 
    fetchAll: boolean,
    isBlindPractice?: boolean,
    blindAlias?: string
  ) => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  currentSymbol,
  syncState,
  onStartOnlineSync,
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'upload' | 'sample'>('online');

  // Online fetch state - automatically normalized, default 15m and full sync
  const [symbol, setSymbol] = useState<string>(() => normalizeBinanceSymbol(currentSymbol || 'BTCUSDT'));
  const [interval, setInterval] = useState<string>('15m');
  const [syncMode, setSyncMode] = useState<'all' | 'custom'>('all');
  const [limit, setLimit] = useState<number>(1000);
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{ fetched: number; total: number; text: string }>({
    fetched: 0,
    total: 0,
    text: '',
  });
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Altcoin catalog & category filters
  const [allSymbols, setAllSymbols] = useState<SymbolMetadata[]>(PRELOADED_FUTURES_SYMBOLS);
  const [isSymbolsFetching, setIsSymbolsFetching] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Blind Practice Settings
  const [isBlindConfigOpen, setIsBlindConfigOpen] = useState<boolean>(false);
  const [blindConfig, setBlindConfig] = useState<{ startDate: string; endDate: string }>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('blind_practice_config');
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return { startDate: '', endDate: '' };
  });

  // Sync symbol & load live Binance market catalog whenever modal opens or currentSymbol changes
  useEffect(() => {
    if (isOpen) {
      const initial = normalizeBinanceSymbol(currentSymbol || 'BTCUSDT');
      setSymbol(initial);
      setFetchError(null);
      setIsSymbolsFetching(true);
      
      // Fetch live exchangeInfo symbols asynchronously and cache them
      loadLiveBinanceFuturesSymbols().then((liveList) => {
        if (liveList && liveList.length > 0) {
          setAllSymbols(liveList);
        }
      }).finally(() => {
        setIsSymbolsFetching(false);
      });
    }
  }, [isOpen, currentSymbol]);

  // Refresh live symbols on demand
  const handleRefreshMarketCatalog = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSymbolsFetching(true);
    try {
      const refreshed = await loadLiveBinanceFuturesSymbols(true);
      if (refreshed && refreshed.length > 0) {
        setAllSymbols(refreshed);
      }
    } finally {
      setIsSymbolsFetching(false);
    }
  };

  // Cooldown status
  const [cooldown, setCooldown] = useState<CooldownStatus>(binanceCooldown.getStatus());

  // Local file upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [customMapping, setCustomMapping] = useState<Partial<ColumnMapping>>({});
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Subscribe to Binance cooldown updates
  useEffect(() => {
    const unsubscribe = binanceCooldown.subscribe((status) => {
      setCooldown(status);
    });
    return () => unsubscribe();
  }, []);

  // Filtered symbols based on category & search query
  const filteredSymbols = useMemo(() => {
    return searchBinanceSymbols(searchQuery || symbol, selectedCategory, allSymbols);
  }, [searchQuery, symbol, selectedCategory, allSymbols]);

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', name: '全部币对', icon: Coins },
    { id: 'MAJOR', name: '🔥 主流蓝筹', icon: Flame },
    { id: 'MEME', name: '🐶 MEME狂潮', icon: Sparkles },
    { id: 'AI', name: '🤖 AI & DePIN', icon: Bot },
    { id: 'LAYER1_2', name: '⚡ 公链 & L2', icon: Zap },
    { id: 'DEFI', name: '🏦 DeFi衍生品', icon: Activity },
    { id: 'GAMEFI', name: '🎮 GameFi铭文', icon: Gamepad2 },
  ];

  const handleFetchOnline = async (overrideSymbol?: string) => {
    const rawTarget = typeof overrideSymbol === 'string' ? overrideSymbol : symbol;
    const targetSymbol = normalizeBinanceSymbol(rawTarget || 'BTCUSDT');
    
    if (!targetSymbol) return;
    
    // Update state to confirmed symbol
    setSymbol(targetSymbol);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setFetchError(null);

    // If global handler is provided, delegate to App level sync manager so background sync is safe
    if (onStartOnlineSync) {
      onStartOnlineSync(targetSymbol, interval, marketType, syncMode === 'all');
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      let candles: Candle[] = [];
      if (syncMode === 'all') {
        candles = await fetchAllBinanceKlines({
          symbol: targetSymbol,
          interval,
          marketType,
          onProgress: (fetched, total, text) => {
            setLoadingProgress({ fetched, total, text });
          },
        });
      } else {
        candles = await fetchBinanceKlines({
          symbol: targetSymbol,
          interval,
          limit,
          marketType,
          onProgress: (fetched, total, text) => {
            setLoadingProgress({ fetched, total, text });
          },
        });
      }

      if (candles.length > 0) {
        onDataLoaded(candles, targetSymbol, interval);
        onClose();
      } else {
        setFetchError('未获取到行情数据，请检查交易对符号');
      }
    } catch (err: any) {
      setFetchError(err.message || '获取币安行情失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // "进阶练剑" Game Mode: Randomly selects from cached Binance perpetual symbols, syncs 15m K-lines blindly
  const handleStartBlindPractice = () => {
    // 1. Gather all candidates from cached Binance perpetual symbols (allSymbols contains 528+ pairs)
    let candidates = (allSymbols && allSymbols.length > 0)
      ? allSymbols.filter((s) => s.quoteAsset === 'USDT' || s.symbol.endsWith('USDT'))
      : PRELOADED_FUTURES_SYMBOLS;

    // Apply custom time range filter if configured
    if (blindConfig.startDate || blindConfig.endDate) {
      const startMs = blindConfig.startDate ? new Date(blindConfig.startDate).getTime() : 0;
      // Add 24 hours to endDate to include the entire day
      const endMs = blindConfig.endDate ? new Date(blindConfig.endDate).getTime() + 86399999 : Infinity;
      
      candidates = candidates.filter((s) => {
        // If onboardDate is missing, we exclude it from the date-filtered pool to be safe
        if (!s.onboardDate) return false;
        return s.onboardDate >= startMs && s.onboardDate <= endMs;
      });
    }

    if (candidates.length === 0) {
      setFetchError('错误：在您自定义的上线时间范围内，未找到任何符合条件的币安永续合约。请扩大时间范围或更新市场缓存！');
      return;
    }

    const list = candidates.length > 0 ? candidates : PRELOADED_FUTURES_SYMBOLS;
    const randomIndex = Math.floor(Math.random() * list.length);
    const chosen = list[randomIndex];
    const targetSymbol = chosen.symbol;

    // 2. Generate a game-style sword alias so the user tests purely based on price action
    const swordNames = [
      '玄铁重剑', '倚天宝剑', '屠龙魔刃', '青釭神剑', '干将莫邪', 
      '太阿古剑', '龙泉宝剑', '承影神锋', '赤霄神剑', '湛卢灵剑',
      '纯钧名剑', '紫霄玄剑', '巨阙神兵', '画影古剑', '凌虚道剑',
      '碧血照丹', '七星龙渊', '霜之哀伤', '天火圣裁', '诛仙绝剑'
    ];
    const randomSword = swordNames[Math.floor(Math.random() * swordNames.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    const alias = `【${randomSword} #${randomNum}】`;

    // 3. Delegate to 15m sync with blind mode flag
    if (onStartOnlineSync) {
      onStartOnlineSync(targetSymbol, '15m', 'futures', true, true, alias);
      onClose();
    } else {
      handleFetchOnline(targetSymbol);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setFetchError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    const result = await parseFileToCandles(file);
    setParseResult(result);
    setCustomMapping(result.detectedColumns);
    setIsParsing(false);
  };

  const handleRemapFile = async () => {
    if (!selectedFile) return;
    setIsParsing(true);
    const result = await parseFileToCandles(selectedFile, customMapping);
    setParseResult(result);
    setIsParsing(false);
  };

  const handleConfirmUpload = () => {
    if (parseResult && parseResult.candles.length > 0) {
      const symbolName = parseResult.filename.replace(/\.[^/.]+$/, '').toUpperCase();
      onDataLoaded(parseResult.candles, symbolName || 'CUSTOM/USDT', parseResult.detectedInterval);
      onClose();
    }
  };

  const handleLoadSample = () => {
    const sampleCandles = generateSampleBTC15m();
    onDataLoaded(sampleCandles, 'BTCUSDT', '15m');
    onClose();
  };

  const normalizedCurrentSymbol = normalizeBinanceSymbol(symbol);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-[#0e1620] border border-[#223348] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden"
        onClick={() => setIsDropdownOpen(false)}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1d2b3b] bg-[#0a1017]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>行情数据管理与导入中心</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  支持全量币安山寨币合约
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                支持币安在线极速获取（智能防封冷却）、本地多格式表格解析及多周期聚合
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1a2636] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-[#1d2b3b] bg-[#0b1118] px-6">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs transition-all border-b-2 ${
              activeTab === 'online'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>币安在线行情 (全量山寨币 + 防封冷却)</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs transition-all border-b-2 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>本地表格导入 (CSV/Excel/JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('sample')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs transition-all border-b-2 ${
              activeTab === 'sample'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>内置优质测试行情</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-200">
          {/* TAB 1: ONLINE FETCH */}
          {activeTab === 'online' && (
            <div className="space-y-4">
              {/* Cooldown Status Card */}
              <div className="p-3.5 bg-[#121c27] rounded-xl border border-[#223348] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-100 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>币安API访问频率安全监控 (防限流冷却系统)</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                    链路安全健康
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[#0b1118] p-2 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block mb-0.5">近1分钟请求权重</span>
                    <span className="font-mono font-bold text-slate-100">
                      {cooldown.rateLimitWeightUsed} / {cooldown.maxWeight}
                    </span>
                  </div>
                  <div className="bg-[#0b1118] p-2 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block mb-0.5">连续请求安全间隙</span>
                    <span className="font-mono font-bold text-slate-100">
                      {cooldown.cooldownRemainingSeconds > 0 ? (
                        <span className="text-amber-400 font-bold">{cooldown.cooldownRemainingSeconds}s 冷却中</span>
                      ) : (
                        <span className="text-emerald-400">就绪 (0s)</span>
                      )}
                    </span>
                  </div>
                  <div className="bg-[#0b1118] p-2 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block mb-0.5">分批下载安全限速</span>
                    <span className="font-mono font-bold text-cyan-400">智能队列保护开启</span>
                  </div>
                </div>
              </div>

              {/* Symbol Selector with Smart Auto-Completion & Category Filter */}
              <div className="bg-[#121c27]/70 p-4 rounded-xl border border-[#223348] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-300 font-bold text-sm">合约交易对搜索与输入</label>
                    <span className="text-[11px] text-slate-400">
                      (输入中文或代码自动匹配币安合约，如 <code className="text-amber-300 bg-black/40 px-1 rounded">牛来</code>、<code className="text-amber-300 bg-black/40 px-1 rounded">大饼</code>、<code className="text-amber-300 bg-black/40 px-1 rounded">以太</code>、<code className="text-amber-300 bg-black/40 px-1 rounded">狗狗</code>、<code className="text-amber-300 bg-black/40 px-1 rounded">COW</code>)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live Market Cache Status Pill */}
                    <div 
                      onClick={handleRefreshMarketCatalog}
                      title="点击刷新币安最新合约列表并更新本地缓存"
                      className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 cursor-pointer hover:bg-emerald-900/80 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isSymbolsFetching ? 'animate-ping' : ''}`} />
                      <span>{isSymbolsFetching ? '正在同步币安市场...' : `已本地缓存 ${allSymbols.length} 个币安合约`}</span>
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-cyan-950/80 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-700/50">
                      <span className="text-slate-400">确认代码:</span>
                      <span className="font-bold text-cyan-400">{normalizedCurrentSymbol}</span>
                    </div>

                    {/* Game-styled "进阶练剑" Button matching user red box */}
                    <div className="flex items-center gap-1">
                      <button
                        id="btn-advanced-sword-practice"
                        type="button"
                        onClick={handleStartBlindPractice}
                        title="⚔️ 进阶练剑（未知标的盲测模式）：从本地缓存的 528+ 个币安永续合约中随机抽取一个币对，同步 15m K线并隐藏币种名称，避免主观偏见，助您进行纯粹客观的盘感与回测训练！"
                        className="group relative flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 bg-gradient-to-r from-amber-500/25 via-purple-600/35 to-rose-500/25 hover:from-amber-500/40 hover:via-purple-600/50 hover:to-rose-500/40 text-amber-200 hover:text-white border border-amber-500/60 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(168,85,247,0.45)] cursor-pointer select-none"
                      >
                        <Swords className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="tracking-wide text-[11px] font-bold bg-gradient-to-r from-amber-300 via-amber-100 to-rose-300 bg-clip-text text-transparent group-hover:text-white">
                          进阶练剑
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-normal">
                          盲测
                        </span>
                        <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBlindConfigOpen(true)}
                        title="配置盲测备选池 (指定上线时间范围)"
                        className="p-1.5 rounded-lg bg-[#0e1520] hover:bg-[#162032] border border-[#1e2c3e] hover:border-amber-500/40 text-slate-400 hover:text-amber-300 transition-colors shadow-sm cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search Input Box */}
                <div 
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => {
                        setSymbol(e.target.value);
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                        setFocusedIndex(-1);
                        setFetchError(null);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setFocusedIndex((prev) => Math.min(prev + 1, Math.min(filteredSymbols.length - 1, 24)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setFocusedIndex((prev) => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (focusedIndex >= 0 && filteredSymbols[focusedIndex]) {
                            handleSelectSymbol(filteredSymbols[focusedIndex].symbol);
                          } else {
                            handleFetchOnline();
                          }
                        } else if (e.key === 'Escape') {
                          setIsDropdownOpen(false);
                        }
                      }}
                      placeholder="搜索或输入任意合约名称/简体中文 (例如: 牛来, 比特币, 大饼, 以太, 佩佩, 松鼠, ETH, COW...)"
                      className="w-full bg-[#0a1017] border border-[#2a3c52] rounded-lg pl-10 pr-28 py-2.5 text-slate-100 font-mono text-sm font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                    <button
                      onClick={() => handleFetchOnline()}
                      disabled={isLoading}
                      className="absolute right-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>选择并获取</span>
                    </button>
                  </div>

                  {/* Real-time Filtered Dropdown */}
                  {isDropdownOpen && filteredSymbols.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0b1118] border border-[#25374c] rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-[#182637]">
                      <div className="px-3 py-1.5 bg-[#0e1622] text-[10px] text-slate-400 flex items-center justify-between sticky top-0 z-10">
                        <span>本地匹配到 {filteredSymbols.length} 个活跃币安永续合约</span>
                        <span>点击币对即可确认填入</span>
                      </div>
                      {filteredSymbols.slice(0, 25).map((item, idx) => {
                        const isSelected = normalizedCurrentSymbol === item.symbol || symbol === item.symbol;
                        const isFocused = focusedIndex === idx;
                        return (
                          <div
                            key={item.symbol}
                            onClick={() => handleSelectSymbol(item.symbol)}
                            onMouseEnter={() => setFocusedIndex(idx)}
                            className={`px-3.5 py-2 cursor-pointer flex items-center justify-between group transition-colors ${
                              isFocused ? 'bg-cyan-950/60' : 'hover:bg-cyan-950/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-bold text-slate-100 group-hover:text-cyan-300">
                                {item.symbol}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {item.displayName}
                              </span>
                              {item.multiplier && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  {item.multiplier}x 乘数
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-[#121c27]">
                                {item.category}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Category Chips Bar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                            : 'bg-[#0a1017] text-slate-400 border-[#1d2c3e] hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Popular / Categorized Coin Pills */}
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 pt-1 border-t border-[#1a2736]">
                  {filteredSymbols.slice(0, 36).map((item) => {
                    const isSelected = normalizedCurrentSymbol === item.symbol;
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => handleSelectSymbol(item.symbol)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold shadow-sm shadow-cyan-500/20 scale-105'
                            : 'bg-[#0a1017] text-slate-300 border-[#1d2b3b] hover:border-cyan-500/40 hover:text-slate-100 hover:bg-[#121c27]'
                        }`}
                      >
                        <span>{item.symbol}</span>
                        {item.multiplier && (
                          <span className="text-[9px] text-amber-400 font-sans">Meme</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeframe & Market Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#0b1118] p-3 rounded-lg border border-[#1e2d3e]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-bold">K线基底周期</label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                      默认 15分钟 (15m)
                    </span>
                  </div>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="w-full bg-[#121c27] border border-[#223348] rounded px-2.5 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="15m">15分钟 (15m) - 默认高精度全量基底</option>
                    <option value="1m">1分钟 (1m) - 超高频</option>
                    <option value="5m">5分钟 (5m)</option>
                    <option value="30m">30分钟 (30m)</option>
                    <option value="1h">1小时 (1h)</option>
                    <option value="4h">4小时 (4h)</option>
                    <option value="1d">日线 (1d)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    系统将以此周期全量拉取，并支持在主图无损多周期智能聚合。
                  </p>
                </div>

                <div className="bg-[#0b1118] p-3 rounded-lg border border-[#1e2d3e]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-bold">历史同步深度</label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                      全量自动同步
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSyncMode('all')}
                        className={`flex-1 py-1.5 px-2 rounded text-[11px] font-semibold border transition-all ${
                          syncMode === 'all'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                            : 'bg-[#121c27] text-slate-400 border-[#223348] hover:text-slate-200'
                        }`}
                      >
                        ⚡ 自动同步全部行情
                      </button>
                      <button
                        onClick={() => setSyncMode('custom')}
                        className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all ${
                          syncMode === 'custom'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                            : 'bg-[#121c27] text-slate-400 border-[#223348] hover:text-slate-200'
                        }`}
                      >
                        指定根数
                      </button>
                    </div>

                    {syncMode === 'custom' && (
                      <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="w-full bg-[#121c27] border border-[#223348] rounded px-2 py-1 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 text-xs mt-1"
                      >
                        <option value="1000">最近 1000 根</option>
                        <option value="2000">最近 2000 根</option>
                        <option value="5000">最近 5000 根</option>
                        <option value="10000">最近 10000 根</option>
                      </select>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {syncMode === 'all' ? '由近及远无缝拉取全部历史K线，自动执行安全防限流冷却。' : '按所选根数分批获取。'}
                  </p>
                </div>

                <div className="bg-[#0b1118] p-3 rounded-lg border border-[#1e2d3e]">
                  <label className="block text-slate-300 font-bold mb-1.5">市场类型</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMarketType('futures')}
                      className={`flex-1 py-1.5 rounded font-semibold text-center border text-xs transition-all ${
                        marketType === 'futures'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                          : 'bg-[#121c27] text-slate-400 border-[#223348] hover:text-slate-200'
                      }`}
                    >
                      USDT永续合约
                    </button>
                    <button
                      onClick={() => setMarketType('spot')}
                      className={`flex-1 py-1.5 rounded font-semibold text-center border text-xs transition-all ${
                        marketType === 'spot'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                          : 'bg-[#121c27] text-slate-400 border-[#223348] hover:text-slate-200'
                      }`}
                    >
                      现货 (Spot)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    永续合约拥有完整杠杆与深度订单簿历史
                  </p>
                </div>
              </div>

              {/* Progress or Error */}
              {(isLoading || (syncState && syncState.status === 'SYNCING')) && (
                <div className="bg-[#0b1118] p-3.5 rounded-lg border border-cyan-500/50 space-y-2.5">
                  <div className="flex items-center justify-between text-cyan-300 font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span>{syncState?.statusText || loadingProgress.text || '正在安全同步全量历史行情 (智能防限流冷却中)...'}</span>
                    </div>
                    <span className="font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700 text-cyan-300">
                      已同步: {(syncState?.fetchedCount || loadingProgress.fetched).toLocaleString()} 根
                    </span>
                  </div>
                  <div className="w-full bg-[#182637] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300 animate-pulse"
                      style={{
                        width: '100%',
                      }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>行情正在安全同步到本地内存中，同步期间回测处于安全锁定保护状态。</span>
                  </p>
                </div>
              )}

              {fetchError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">获取遇到问题: </span>
                      <span>{fetchError}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        setSymbol('BTCUSDT');
                        handleFetchOnline('BTCUSDT');
                      }}
                      className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/50 rounded text-xs font-semibold transition-colors"
                    >
                      一键切换为 BTCUSDT 并重试
                    </button>
                    <button
                      onClick={() => {
                        setSymbol('ETHUSDT');
                        handleFetchOnline('ETHUSDT');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs transition-colors"
                    >
                      切换为 ETHUSDT
                    </button>
                    <button
                      onClick={() => {
                        setSymbol('SOLUSDT');
                        handleFetchOnline('SOLUSDT');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs transition-colors"
                    >
                      切换为 SOLUSDT
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleFetchOnline()}
                disabled={isLoading || syncState?.status === 'SYNCING'}
                className="w-full py-3 bg-[#00C087] hover:bg-[#00db9a] text-slate-950 font-bold rounded-lg shadow-lg shadow-[#00c087]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>
                  {syncMode === 'all'
                    ? `开始全量安全同步 ${normalizedCurrentSymbol} (默认 15m 全量历史)`
                    : `获取 ${normalizedCurrentSymbol} 最近 ${limit} 根 K线`}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: LOCAL FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#24354b] hover:border-cyan-500/60 bg-[#121c27]/60 hover:bg-[#121c27] rounded-xl p-6 text-center cursor-pointer transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.txt,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-cyan-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200 mb-1">
                  {selectedFile ? selectedFile.name : '点击或拖拽上传行情表格文件'}
                </p>
                <p className="text-[11px] text-slate-400">
                  支持格式：<span className="text-cyan-300">CSV (.csv)</span>、<span className="text-cyan-300">Excel (.xlsx, .xls)</span>、<span className="text-cyan-300">JSON (.json)</span>、TXT表格
                </p>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="text-center py-4 text-cyan-300 animate-pulse font-semibold">
                  正在智能分析表格结构与自动匹配列...
                </div>
              )}

              {/* Parsed Result & Column Remapping */}
              {parseResult && !isParsing && (
                <div className="space-y-4 bg-[#121c27] p-4 rounded-xl border border-[#223348]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1d2b3b]">
                    <div>
                      <span className="font-bold text-slate-100">{parseResult.filename}</span>
                      <span className="ml-2 text-emerald-400 font-mono text-[11px]">
                        ✓ 成功解析 {parseResult.candles.length} 条记录 (识别粒度: {INTERVAL_LABELS[parseResult.detectedInterval] || parseResult.detectedInterval})
                      </span>
                    </div>
                  </div>

                  {/* Column Mapping Selectors */}
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-2">字段匹配映射 (智能匹配结果，可手动修正)</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['timestamp', 'open', 'high', 'low', 'close', 'volume'] as const).map((field) => (
                        <div key={field} className="bg-[#0b1118] p-2 rounded border border-[#1d2b3b]">
                          <label className="block text-[10px] text-slate-400 uppercase mb-1 font-bold">
                            {field === 'timestamp' ? '时间 (Time)' : field}
                          </label>
                          <select
                            value={customMapping[field] || ''}
                            onChange={(e) => {
                              setCustomMapping((prev) => ({
                                ...prev,
                                [field]: e.target.value,
                              }));
                            }}
                            className="w-full bg-[#121c27] text-slate-200 text-xs rounded px-1.5 py-1 border border-[#223348] focus:outline-none focus:border-cyan-400"
                          >
                            <option value="">未匹配</option>
                            {parseResult.rawHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1">解析数据前 3 条预览</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead>
                          <tr className="text-slate-400 border-b border-[#1d2b3b]">
                            <th className="py-1">时间</th>
                            <th className="py-1">开盘</th>
                            <th className="py-1">最高</th>
                            <th className="py-1">最低</th>
                            <th className="py-1">收盘</th>
                            <th className="py-1">成交量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.candles.slice(0, 3).map((c, i) => (
                            <tr key={i} className="border-b border-[#141e2b] text-slate-200">
                              <td className="py-1">{new Date(c.timestamp).toLocaleString()}</td>
                              <td className="py-1 text-cyan-300">{c.open}</td>
                              <td className="py-1 text-emerald-400">{c.high}</td>
                              <td className="py-1 text-rose-400">{c.low}</td>
                              <td className="py-1 text-cyan-300">{c.close}</td>
                              <td className="py-1 text-slate-400">{c.volume.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleRemapFile}
                      className="px-4 py-2 bg-[#1b2838] hover:bg-[#223348] text-slate-200 rounded font-semibold transition-colors"
                    >
                      重新按选定列解析
                    </button>
                    <button
                      onClick={handleConfirmUpload}
                      disabled={parseResult.candles.length === 0}
                      className="flex-1 py-2 bg-[#00C087] hover:bg-[#00db9a] text-slate-950 font-bold rounded shadow-lg shadow-[#00c087]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>确认导入并加载到回测图表</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAMPLE DATA */}
          {activeTab === 'sample' && (
            <div className="space-y-4">
              <div className="bg-[#121c27] p-5 rounded-xl border border-[#223348] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">内置 BTCUSDT 永续合约典型行情样本 (15m粒度)</h3>
                    <p className="text-xs text-slate-400">
                      包含 350+ 根连续高保真 15m K线，内置完整震荡、突破、双底反转及均线交叉形态
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="bg-[#0b1118] p-2.5 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block text-[10px]">基底周期</span>
                    <span className="font-bold text-slate-100 font-mono">15分钟 (15m)</span>
                  </div>
                  <div className="bg-[#0b1118] p-2.5 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block text-[10px]">可合成周期</span>
                    <span className="font-bold text-cyan-400 font-mono">1h / 4h / 日线</span>
                  </div>
                  <div className="bg-[#0b1118] p-2.5 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block text-[10px]">典型特征K线</span>
                    <span className="font-bold text-amber-400 font-mono">放量突破 / 探底</span>
                  </div>
                  <div className="bg-[#0b1118] p-2.5 rounded border border-[#1d2a3a]">
                    <span className="text-slate-400 block text-[10px]">数据完整度</span>
                    <span className="font-bold text-emerald-400 font-mono">100% OHLCV</span>
                  </div>
                </div>

                <button
                  onClick={handleLoadSample}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>载入样本行情开始回测体验</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blind Practice Config Modal */}
      {isBlindConfigOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-[#0f1722] border border-[#1e2c3e] rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2c3e] bg-[#0a1017]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">定制盲测备选池</h3>
              </div>
              <button onClick={() => setIsBlindConfigOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-xs text-slate-400 leading-relaxed">
                您可以自定义目标币种的上线时间区间（例如：只抽取 2021年到2022年上线的币种）。留空则不限制。
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">最早一根K线开始时间 (选填)</label>
                  <input
                    type="date"
                    value={blindConfig.startDate}
                    onChange={(e) => setBlindConfig(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-[#090f17] border border-[#1e2c3e] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">最早一根K线结束时间 (选填)</label>
                  <input
                    type="date"
                    value={blindConfig.endDate}
                    onChange={(e) => setBlindConfig(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-[#090f17] border border-[#1e2c3e] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#1e2c3e] bg-[#0a1017] flex justify-end gap-2">
              <button
                onClick={() => {
                  setBlindConfig({ startDate: '', endDate: '' });
                  if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem('blind_practice_config');
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#162032] transition-colors"
              >
                重置
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('blind_practice_config', JSON.stringify(blindConfig));
                  }
                  setIsBlindConfigOpen(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

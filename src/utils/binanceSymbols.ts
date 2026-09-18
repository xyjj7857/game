export interface SymbolMetadata {
  symbol: string;         // e.g. 'BTCUSDT', '1000PEPEUSDT', 'PIPPINUSDT'
  baseAsset: string;      // e.g. 'BTC', 'PEPE', 'PIPPIN'
  quoteAsset: string;     // e.g. 'USDT'
  category: 'MAJOR' | 'MEME' | 'AI' | 'LAYER1_2' | 'DEFI' | 'GAMEFI' | 'OTHER';
  displayName: string;    // e.g. 'BTC (Bitcoin / 比特币)'
  chineseName?: string;   // e.g. '比特币'
  chineseAliases?: string[]; // e.g. ['大饼', '比特', 'BTC']
  multiplier?: number;    // e.g. 1000 for 1000PEPE
  onboardDate?: number;   // Timestamp of listing
}

// Comprehensive Chinese nicknames and aliases to Binance Futures Symbol mapping
export const CHINESE_SYMBOL_MAP: Record<string, string> = {
  // 1. MAJOR
  '比特币': 'BTCUSDT',
  '大饼': 'BTCUSDT',
  '比特': 'BTCUSDT',
  '以太坊': 'ETHUSDT',
  '以太': 'ETHUSDT',
  '二饼': 'ETHUSDT',
  '姨太': 'ETHUSDT',
  '索拉纳': 'SOLUSDT',
  '阳光': 'SOLUSDT',
  '币安币': 'BNBUSDT',
  '币安': 'BNBUSDT',
  '瑞波币': 'XRPUSDT',
  '瑞波': 'XRPUSDT',
  '狗狗币': 'DOGEUSDT',
  '狗狗': 'DOGEUSDT',
  '狗子': 'DOGEUSDT',
  '艾达币': 'ADAUSDT',
  '艾达': 'ADAUSDT',
  '卡尔达诺': 'ADAUSDT',
  '雪崩币': 'AVAXUSDT',
  '雪崩': 'AVAXUSDT',
  '链克': 'LINKUSDT',
  '预言机': 'LINKUSDT',
  '波场币': 'TRXUSDT',
  '波场': 'TRXUSDT',
  '孙哥': 'TRXUSDT',
  '孙割': 'TRXUSDT',
  '莱特币': 'LTCUSDT',
  '莱特': 'LTCUSDT',
  '辣条': 'LTCUSDT',
  '波卡币': 'DOTUSDT',
  '波卡': 'DOTUSDT',
  '比特现金': 'BCHUSDT',
  '太子': 'BCHUSDT',

  // 2. MEME
  '佩佩': '1000PEPEUSDT',
  '悲伤蛙': '1000PEPEUSDT',
  '青蛙': '1000PEPEUSDT',
  '蛙蛙': '1000PEPEUSDT',
  '绿蛙': '1000PEPEUSDT',
  '戴帽狗': 'WIFUSDT',
  '帽子狗': 'WIFUSDT',
  '狗妇': 'WIFUSDT',
  '柴犬币': '1000SHIBUSDT',
  '柴犬': '1000SHIBUSDT',
  '屎币': '1000SHIBUSDT',
  '邦克': '1000BONKUSDT',
  '棒克': '1000BONKUSDT',
  '弗洛基': '1000FLOKIUSDT',
  '维京狗': '1000FLOKIUSDT',
  '松鼠': 'PNUTUSDT',
  '小松鼠': 'PNUTUSDT',
  '花生松鼠': 'PNUTUSDT',
  '花生': 'PNUTUSDT',
  '皮聘': 'PIPPINUSDT',
  '独角兽': 'PIPPINUSDT',
  '弹跳猪': 'MOODENGUSDT',
  '侏儒河马': 'MOODENGUSDT',
  '猪猪': 'MOODENGUSDT',
  '穆登': 'MOODENGUSDT',
  '爆米花猫': 'POPCATUSDT',
  '啵啵猫': 'POPCATUSDT',
  '猫狗': 'MEWUSDT',
  '狗界猫': 'MEWUSDT',
  '蛙书': 'BOMEUSDT',
  '模因书': 'BOMEUSDT',
  '芝士狗': '1000CHEEMSUSDT',
  '大象': '1000WHYUSDT',
  '为什么': '1000WHYUSDT',
  '西蒙猫': '1000CATUSDT',
  '动画猫': '1000CATUSDT',
  '莫格': '1000000MOGUSDT',
  '墨镜猫': '1000000MOGUSDT',
  '宝贝狗': '1000000BABYDOGEUSDT',
  '婴儿狗': '1000000BABYDOGEUSDT',
  '涡轮': 'TURBOUSDT',
  '蛤蟆': 'TURBOUSDT',
  '布雷特': 'BRETTUSDT',
  '人民': 'PEOPLEUSDT',
  '宪法': 'PEOPLEUSDT',
  '树懒': 'SLERFUSDT',
  '河马': 'HIPPOUSDT',
  '香蕉': 'BANUSDT',
  '艺术香蕉': 'BANUSDT',
  '露切': 'LUCEUSDT',
  '吉祥物': 'LUCEUSDT',

  // 3. AI & DePIN
  '张量': 'TAOUSDT',
  '神经元': 'TAOUSDT',
  '近协议': 'NEARUSDT',
  '渲染': 'RENDERUSDT',
  '云渲染': 'RENDERUSDT',
  '人工智能': 'FETUSDT',
  '超级智能': 'FETUSDT',
  '虚拟人': 'VIRTUALUSDT',
  '虚拟协议': 'VIRTUALUSDT',
  '小草': 'GRASSUSDT',
  '挖草': 'GRASSUSDT',
  '草': 'GRASSUSDT',
  '算力云': 'IOUSDT',
  '世界币': 'WLDUSDT',
  '虹膜': 'WLDUSDT',
  '奥特曼': 'WLDUSDT',
  '阿卡姆': 'ARKMUSDT',
  '链上侦探': 'ARKMUSDT',
  '无眠': 'AIUSDT',
  '虚拟男友': 'AIUSDT',
  '提示词': 'NFPUSDT',
  '奇点': 'AGIXUSDT',
  '文件币': 'FILUSDT',
  '飞尔': 'FILUSDT',
  '星际文件': 'FILUSDT',
  '永久存储': 'ARUSDT',
  '织女星': 'ARUSDT',
  '算力网络': 'AKTUSDT',
  '海洋': 'OCEANUSDT',
  '法拉': 'PHAUSDT',

  // 4. LAYER 1 & 2
  '隋': 'SUIUSDT',
  '隋链': 'SUIUSDT',
  '睡链': 'SUIUSDT',
  '阿普托斯': 'APTUSDT',
  '兔链': 'APTUSDT',
  '妹子链': 'SEIUSDT',
  '模块化': 'TIAUSDT',
  '塞拉斯提亚': 'TIAUSDT',
  '射手': 'INJUSDT',
  '电报币': 'TONUSDT',
  '吨币': 'TONUSDT',
  '电报': 'TONUSDT',
  '仲裁者': 'ARBUSDT',
  '二层龙头': 'ARBUSDT',
  '乐观': 'OPUSDT',
  '马蹄': 'POLUSDT',
  '多边形': 'POLUSDT',
  '马蹄链': 'POLUSDT',
  '斯塔克': 'STRKUSDT',
  '时代': 'ZKUSDT',
  '歌剧': 'FTMUSDT',
  '幻影': 'FTMUSDT',
  '卡斯帕': 'KASUSDT',
  '幽灵协议': 'KASUSDT',
  '算法': 'ALGOUSDT',
  '阿尔戈': 'ALGOUSDT',
  '哈希图': 'HBARUSDT',
  '宇宙': 'ATOMUSDT',
  '阿童木': 'ATOMUSDT',
  '互联网计算机': 'ICPUSDT',
  '无限机': 'ICPUSDT',
  '电脑币': 'ICPUSDT',
  '蝠鲼': 'MANTAUSDT',
  '维度': 'DYMUSDT',
  '全链': 'ZETAUSDT',

  // 5. DEFI
  '独角兽交易': 'UNIUSDT',
  '幽灵借贷': 'AAVEUSDT',
  '本息分离': 'PENDLEUSDT',
  '木星': 'JUPUSDT',
  '射线': 'RAYUSDT',
  '合成美元': 'ENAUSDT',
  '创客': 'MKRUSDT',
  '曲线': 'CRVUSDT',
  '丽都': 'LDOUSDT',
  '衍生品': 'DYDXUSDT',
  '雷神': 'RUNEUSDT',
  '合成资产': 'SNXUSDT',
  '奶牛': 'COWUSDT',
  '奶牛协议': 'COWUSDT',
  '奶牛币': 'COWUSDT',
  '牛来': 'COWUSDT',
  '牛来币': 'COWUSDT',
  '牛来了': 'COWUSDT',
  '牛来usdt': 'COWUSDT',
  '牛来USDT': 'COWUSDT',
  'COW': 'COWUSDT',
  'COWUSDT': 'COWUSDT',
  '一寸': '1INCHUSDT',
  '复合借贷': 'COMPUSDT',
  '寿司': 'SUSHIUSDT',

  // 6. GAMEFI & 铭文
  '铭文之王': 'ORDIUSDT',
  '奥丁': 'ORDIUSDT',
  '奥迪': 'ORDIUSDT',
  '铭文': 'ORDIUSDT',
  '聪': '1000SATSUSDT',
  '聪铭文': '1000SATSUSDT',
  '老鼠': '1000RATSUSDT',
  '老鼠铭文': '1000RATSUSDT',
  '盛宴': 'GALAUSDT',
  '沙盒': 'SANDUSDT',
  '分散大陆': 'MANAUSDT',
  '链游之王': 'AXSUSDT',
  '像素': 'PIXELUSDT',
  '游戏公会': 'YGGUSDT',
  '大时代': 'BIGTIMEUSDT',
  '传送门': 'PORTALUSDT',
  '浪人': 'RONINUSDT',

  // 7. OTHER
  '经典露娜': '1000LUNCUSDT',
  '露娜': '1000LUNCUSDT',
  '归零币': '1000LUNCUSDT',
  '新露娜': 'LUNA2USDT',
  '算稳': 'USTCUSDT',
  '小蚁': 'NEOUSDT',
  '小蚁币': 'NEOUSDT',
  '中国以太坊': 'NEOUSDT',
  '柚子': 'EOSUSDT',
  '柚子币': 'EOSUSDT',
  '以太经典': 'ETCUSDT',
  '大零币': 'ZECUSDT',
  '零币': 'ZECUSDT',
  '门罗币': 'XMRUSDT',
  '门罗': 'XMRUSDT',
  '达世币': 'DASHUSDT',
  '曼陀罗': 'OMUSDT',
  '奥多': 'ONDOUSDT',
  '粉丝代币': 'CHZUSDT',
};

// Multiplier mapping for Binance Futures contracts that require 1000x / 1000000x prefixes
export const FUTURES_MULTIPLIER_MAP: Record<string, string> = {
  'PEPE': '1000PEPEUSDT',
  '1000PEPE': '1000PEPEUSDT',
  'SHIB': '1000SHIBUSDT',
  '1000SHIB': '1000SHIBUSDT',
  'BONK': '1000BONKUSDT',
  '1000BONK': '1000BONKUSDT',
  'FLOKI': '1000FLOKIUSDT',
  '1000FLOKI': '1000FLOKIUSDT',
  'LUNC': '1000LUNCUSDT',
  '1000LUNC': '1000LUNCUSDT',
  'SATS': '1000SATSUSDT',
  '1000SATS': '1000SATSUSDT',
  'RATS': '1000RATSUSDT',
  '1000RATS': '1000RATSUSDT',
  'CAT': '1000CATUSDT',
  '1000CAT': '1000CATUSDT',
  'CHEEMS': '1000CHEEMSUSDT',
  '1000CHEEMS': '1000CHEEMSUSDT',
  'WHY': '1000WHYUSDT',
  '1000WHY': '1000WHYUSDT',
  'MOG': '1000000MOGUSDT',
  '1000000MOG': '1000000MOGUSDT',
  'BABYDOGE': '1000000BABYDOGEUSDT',
  '1000000BABYDOGE': '1000000BABYDOGEUSDT',
  'X': '1000XUSDT',
  '1000X': '1000XUSDT',
  'BTT': '1000BTTUSDT',
  '1000BTT': '1000BTTUSDT',
  'LADYS': '1000LADYSUSDT',
  '1000LADYS': '1000LADYSUSDT',
};

// Comprehensive active Binance USDT Perpetual Futures catalog
export const PRELOADED_FUTURES_SYMBOLS: SymbolMetadata[] = [
  // 1. MAJOR / 主流
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'BTC (Bitcoin / 比特币 / 大饼)', chineseName: '比特币', chineseAliases: ['大饼', '比特', '数字黄金'] },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'ETH (Ethereum / 以太坊 / 二饼)', chineseName: '以太坊', chineseAliases: ['以太', '二饼', '姨太'] },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'SOL (Solana / 索拉纳)', chineseName: '索拉纳', chineseAliases: ['阳光链', '索罗那'] },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'BNB (Build and Build / 币安币)', chineseName: '币安币', chineseAliases: ['币安', 'BNB平台币'] },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'XRP (Ripple / 瑞波币)', chineseName: '瑞波币', chineseAliases: ['瑞波'] },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'DOGE (Dogecoin / 狗狗币)', chineseName: '狗狗币', chineseAliases: ['狗狗', '狗子', '马斯克狗'] },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'ADA (Cardano / 艾达币)', chineseName: '艾达币', chineseAliases: ['艾达', '卡尔达诺'] },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'AVAX (Avalanche / 雪崩币)', chineseName: '雪崩币', chineseAliases: ['雪崩'] },
  { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'LINK (Chainlink / 预言机)', chineseName: '链克', chineseAliases: ['预言机', 'LINK'] },
  { symbol: 'TRXUSDT', baseAsset: 'TRX', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'TRX (TRON / 波场币)', chineseName: '波场币', chineseAliases: ['波场', '孙哥', '孙割'] },
  { symbol: 'LTCUSDT', baseAsset: 'LTC', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'LTC (Litecoin / 莱特币 / 辣条)', chineseName: '莱特币', chineseAliases: ['辣条', '莱特'] },
  { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'DOT (Polkadot / 波卡币)', chineseName: '波卡币', chineseAliases: ['波卡'] },
  { symbol: 'BCHUSDT', baseAsset: 'BCH', quoteAsset: 'USDT', category: 'MAJOR', displayName: 'BCH (Bitcoin Cash / 比特现金 / 太子)', chineseName: '比特现金', chineseAliases: ['太子', '分叉大饼'] },

  // 2. MEME / 模因币
  { symbol: '1000PEPEUSDT', baseAsset: 'PEPE', quoteAsset: 'USDT', category: 'MEME', displayName: '1000PEPE (Pepe The Frog / 佩佩 / 悲伤蛙)', chineseName: '佩佩蛙', chineseAliases: ['佩佩', '悲伤蛙', '青蛙', '绿蛙'], multiplier: 1000 },
  { symbol: 'WIFUSDT', baseAsset: 'WIF', quoteAsset: 'USDT', category: 'MEME', displayName: 'WIF (dogwifhat / 戴帽狗)', chineseName: '戴帽狗', chineseAliases: ['帽子狗', '狗妇'] },
  { symbol: '1000SHIBUSDT', baseAsset: 'SHIB', quoteAsset: 'USDT', category: 'MEME', displayName: '1000SHIB (Shiba Inu / 柴犬币 / 屎币)', chineseName: '柴犬币', chineseAliases: ['柴犬', '屎币', 'SHIB'], multiplier: 1000 },
  { symbol: '1000BONKUSDT', baseAsset: 'BONK', quoteAsset: 'USDT', category: 'MEME', displayName: '1000BONK (Bonk / 邦克)', chineseName: '邦克', chineseAliases: ['棒克', 'SOL狗'], multiplier: 1000 },
  { symbol: '1000FLOKIUSDT', baseAsset: 'FLOKI', quoteAsset: 'USDT', category: 'MEME', displayName: '1000FLOKI (Floki / 弗洛基)', chineseName: '弗洛基', chineseAliases: ['维京狗', 'FLOKI'], multiplier: 1000 },
  { symbol: 'PNUTUSDT', baseAsset: 'PNUT', quoteAsset: 'USDT', category: 'MEME', displayName: 'PNUT (Peanut the Squirrel / 网红松鼠 / 花生)', chineseName: '松鼠', chineseAliases: ['小松鼠', '花生松鼠', '花生'] },
  { symbol: 'ACTUSDT', baseAsset: 'ACT', quoteAsset: 'USDT', category: 'MEME', displayName: 'ACT (Act I : The AI Prophecy / AI预言)', chineseName: 'AI预言', chineseAliases: ['ACT'] },
  { symbol: 'GOATUSDT', baseAsset: 'GOAT', quoteAsset: 'USDT', category: 'MEME', displayName: 'GOAT (Goatseus Maximus / 羊驼 / 机械神羊)', chineseName: '神羊', chineseAliases: ['山羊', 'GOAT'] },
  { symbol: 'NEIROUSDT', baseAsset: 'NEIRO', quoteAsset: 'USDT', category: 'MEME', displayName: 'NEIRO (First Neiro on Ethereum / 新柴犬)', chineseName: '内罗狗', chineseAliases: ['小狗', 'NEIRO'] },
  { symbol: 'NEIROETHUSDT', baseAsset: 'NEIROETH', quoteAsset: 'USDT', category: 'MEME', displayName: 'NEIROETH (Neiro on ETH / 以太内罗)', chineseName: '以太内罗', chineseAliases: ['NEIROETH'] },
  { symbol: 'PIPPINUSDT', baseAsset: 'PIPPIN', quoteAsset: 'USDT', category: 'MEME', displayName: 'PIPPIN (Pippin / 皮聘 / 独角兽)', chineseName: '皮聘', chineseAliases: ['独角兽', '皮聘独角兽', 'PIPPIN'] },
  { symbol: 'MOODENGUSDT', baseAsset: 'MOODENG', quoteAsset: 'USDT', category: 'MEME', displayName: 'MOODENG (Moo Deng / 弹跳猪 / 侏儒河马)', chineseName: '弹跳猪', chineseAliases: ['猪猪', '侏儒河马', '穆登'] },
  { symbol: 'POPCATUSDT', baseAsset: 'POPCAT', quoteAsset: 'USDT', category: 'MEME', displayName: 'POPCAT (Popcat / 啵啵猫 / 爆米花猫)', chineseName: '啵啵猫', chineseAliases: ['爆米花猫', '张嘴猫'] },
  { symbol: 'MEWUSDT', baseAsset: 'MEW', quoteAsset: 'USDT', category: 'MEME', displayName: 'MEW (cat in a dogs world / 狗界猫 / 猫狗)', chineseName: '狗界猫', chineseAliases: ['猫狗', '猫世界'] },
  { symbol: 'BOMEUSDT', baseAsset: 'BOME', quoteAsset: 'USDT', category: 'MEME', displayName: 'BOME (Book of Meme / 佩佩蛙书 / 模因书)', chineseName: '模因书', chineseAliases: ['蛙书', 'BOME'] },
  { symbol: '1000CHEEMSUSDT', baseAsset: 'CHEEMS', quoteAsset: 'USDT', category: 'MEME', displayName: '1000CHEEMS (Cheems / 芝士狗)', chineseName: '芝士狗', chineseAliases: ['奇姆斯', 'CHEEMS'], multiplier: 1000 },
  { symbol: '1000WHYUSDT', baseAsset: 'WHY', quoteAsset: 'USDT', category: 'MEME', displayName: '1000WHY (Why Elephant / 大象)', chineseName: '大象', chineseAliases: ['为什么', '白象'], multiplier: 1000 },
  { symbol: '1000CATUSDT', baseAsset: 'CAT', quoteAsset: 'USDT', category: 'MEME', displayName: '1000CAT (Simon\'s Cat / 西蒙猫)', chineseName: '西蒙猫', chineseAliases: ['动画猫', '西蒙的猫'], multiplier: 1000 },
  { symbol: '1000000MOGUSDT', baseAsset: 'MOG', quoteAsset: 'USDT', category: 'MEME', displayName: '1000000MOG (Mog Coin / 莫格 / 墨镜猫)', chineseName: '墨镜猫', chineseAliases: ['莫格', 'MOG'], multiplier: 1000000 },
  { symbol: '1000000BABYDOGEUSDT', baseAsset: 'BABYDOGE', quoteAsset: 'USDT', category: 'MEME', displayName: '1000000BABYDOGE (Baby Doge / 宝贝狗 / 婴儿狗)', chineseName: '宝贝狗', chineseAliases: ['婴儿狗', 'BABYDOGE'], multiplier: 1000000 },
  { symbol: 'TURBOUSDT', baseAsset: 'TURBO', quoteAsset: 'USDT', category: 'MEME', displayName: 'TURBO (Turbo AI Meme / 涡轮蛤蟆)', chineseName: '涡轮蛤蟆', chineseAliases: ['涡轮', '蛤蟆'] },
  { symbol: 'BRETTUSDT', baseAsset: 'BRETT', quoteAsset: 'USDT', category: 'MEME', displayName: 'BRETT (Brett Base / 布雷特 / 蓝色小人)', chineseName: '布雷特', chineseAliases: ['小蓝人'] },
  { symbol: 'MEMEUSDT', baseAsset: 'MEME', quoteAsset: 'USDT', category: 'MEME', displayName: 'MEME (Memecoin / 模因币)', chineseName: '模因币', chineseAliases: ['MEME'] },
  { symbol: 'MYROUSDT', baseAsset: 'MYRO', quoteAsset: 'USDT', category: 'MEME', displayName: 'MYRO (Myro Dog / 联合创始人狗)', chineseName: '迈罗狗', chineseAliases: ['MYRO'] },
  { symbol: 'PEOPLEUSDT', baseAsset: 'PEOPLE', quoteAsset: 'USDT', category: 'MEME', displayName: 'PEOPLE (ConstitutionDAO / 宪法 / 人民币)', chineseName: '人民币', chineseAliases: ['宪法', 'PEOPLE', '人民'] },
  { symbol: 'SLERFUSDT', baseAsset: 'SLERF', quoteAsset: 'USDT', category: 'MEME', displayName: 'SLERF (Slerf Tree / 树懒)', chineseName: '树懒', chineseAliases: ['呆萌树懒', '树獭'] },
  { symbol: 'HIPPOUSDT', baseAsset: 'HIPPO', quoteAsset: 'USDT', category: 'MEME', displayName: 'HIPPO (Sudeng SUI Hippo / 苏登河马)', chineseName: '苏登河马', chineseAliases: ['河马', 'SUI河马'] },
  { symbol: 'BANUSDT', baseAsset: 'BAN', quoteAsset: 'USDT', category: 'MEME', displayName: 'BAN (Comedian Banana / 艺术香蕉)', chineseName: '艺术香蕉', chineseAliases: ['香蕉', '喜剧香蕉'] },
  { symbol: 'LUCEUSDT', baseAsset: 'LUCE', quoteAsset: 'USDT', category: 'MEME', displayName: 'LUCE (Holy Mascot Luce / 圣女露切)', chineseName: '露切', chineseAliases: ['圣女', '吉祥物'] },

  // 3. AI & DePIN / 人工智能 & 去中心化基础设施
  { symbol: 'TAOUSDT', baseAsset: 'TAO', quoteAsset: 'USDT', category: 'AI', displayName: 'TAO (Bittensor / 张量 / 神经元)', chineseName: '张量协议', chineseAliases: ['神经元', 'TAO', '张量'] },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR', quoteAsset: 'USDT', category: 'AI', displayName: 'NEAR (Near Protocol / 近协议)', chineseName: '近协议', chineseAliases: ['NEAR'] },
  { symbol: 'RENDERUSDT', baseAsset: 'RENDER', quoteAsset: 'USDT', category: 'AI', displayName: 'RENDER (Render Network / 渲染网络)', chineseName: '渲染网络', chineseAliases: ['渲染', '云渲染'] },
  { symbol: 'FETUSDT', baseAsset: 'FET', quoteAsset: 'USDT', category: 'AI', displayName: 'FET (Artificial Superintelligence / 超级智能联盟)', chineseName: '超级智能联盟', chineseAliases: ['人工智能', 'FET'] },
  { symbol: 'VIRTUALUSDT', baseAsset: 'VIRTUAL', quoteAsset: 'USDT', category: 'AI', displayName: 'VIRTUAL (Virtuals Protocol / 虚拟人协议)', chineseName: '虚拟人', chineseAliases: ['虚拟协议', '虚拟偶像'] },
  { symbol: 'AI16ZUSDT', baseAsset: 'AI16Z', quoteAsset: 'USDT', category: 'AI', displayName: 'AI16Z (ai16z / AI风投基金)', chineseName: 'AI风投', chineseAliases: ['AI16Z'] },
  { symbol: 'GRASSUSDT', baseAsset: 'GRASS', quoteAsset: 'USDT', category: 'AI', displayName: 'GRASS (Grass DePIN / 小草 / 闲置带宽)', chineseName: '小草', chineseAliases: ['挖草', '草', 'GRASS'] },
  { symbol: 'IOUSDT', baseAsset: 'IO', quoteAsset: 'USDT', category: 'AI', displayName: 'IO (io.net Cloud GPU / 算力云)', chineseName: '算力云', chineseAliases: ['GPU算力', 'IO'] },
  { symbol: 'WLDUSDT', baseAsset: 'WLD', quoteAsset: 'USDT', category: 'AI', displayName: 'WLD (Worldcoin / 世界币 / 虹膜)', chineseName: '世界币', chineseAliases: ['虹膜', '奥特曼', 'WLD'] },
  { symbol: 'ARKMUSDT', baseAsset: 'ARKM', quoteAsset: 'USDT', category: 'AI', displayName: 'ARKM (Arkham Intelligence / 链上侦探)', chineseName: '阿卡姆', chineseAliases: ['链上侦探', 'ARKM'] },
  { symbol: 'AIUSDT', baseAsset: 'AI', quoteAsset: 'USDT', category: 'AI', displayName: 'AI (Sleepless AI / 无眠 / 虚拟恋爱)', chineseName: '无眠AI', chineseAliases: ['虚拟恋爱', 'AI'] },
  { symbol: 'NFPUSDT', baseAsset: 'NFP', quoteAsset: 'USDT', category: 'AI', displayName: 'NFP (NFPrompt / 提示词生成)', chineseName: '提示词', chineseAliases: ['NFP'] },
  { symbol: 'AGIXUSDT', baseAsset: 'AGIX', quoteAsset: 'USDT', category: 'AI', displayName: 'AGIX (SingularityNET / 奇点网络)', chineseName: '奇点网络', chineseAliases: ['奇点', 'AGIX'] },
  { symbol: 'THETAUSDT', baseAsset: 'THETA', quoteAsset: 'USDT', category: 'AI', displayName: 'THETA (Theta Network / 视频流媒体)', chineseName: '视频流', chineseAliases: ['THETA'] },
  { symbol: 'FILUSDT', baseAsset: 'FIL', quoteAsset: 'USDT', category: 'AI', displayName: 'FIL (Filecoin / 文件币 / 星际文件系统)', chineseName: '文件币', chineseAliases: ['飞尔', '星际文件', 'FIL'] },
  { symbol: 'ARUSDT', baseAsset: 'AR', quoteAsset: 'USDT', category: 'AI', displayName: 'AR (Arweave / 永久存储)', chineseName: '永久存储', chineseAliases: ['织女星', 'AR'] },
  { symbol: 'AKTUSDT', baseAsset: 'AKT', quoteAsset: 'USDT', category: 'AI', displayName: 'AKT (Akash Network / 算力网络)', chineseName: '算力网络', chineseAliases: ['AKT'] },
  { symbol: 'OCEANUSDT', baseAsset: 'OCEAN', quoteAsset: 'USDT', category: 'AI', displayName: 'OCEAN (Ocean Protocol / 海洋协议)', chineseName: '海洋协议', chineseAliases: ['海洋', 'OCEAN'] },
  { symbol: 'PHAUSDT', baseAsset: 'PHA', quoteAsset: 'USDT', category: 'AI', displayName: 'PHA (Phala Network / 隐私云计算)', chineseName: '隐私计算', chineseAliases: ['法拉', 'PHA'] },

  // 4. LAYER 1 & LAYER 2 / 公链生态
  { symbol: 'SUIUSDT', baseAsset: 'SUI', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'SUI (Sui Network / 隋链 / 睡链)', chineseName: '隋链', chineseAliases: ['隋', '睡链', 'SUI'] },
  { symbol: 'APTUSDT', baseAsset: 'APT', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'APT (Aptos / 阿普托斯 / 兔链)', chineseName: '阿普托斯', chineseAliases: ['兔链', 'APT'] },
  { symbol: 'SEIUSDT', baseAsset: 'SEI', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'SEI (Sei Network / 妹子链)', chineseName: '极速链', chineseAliases: ['妹子链', 'SEI'] },
  { symbol: 'TIAUSDT', baseAsset: 'TIA', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'TIA (Celestia / 模块化区块链)', chineseName: '模块化', chineseAliases: ['塞拉斯提亚', 'TIA'] },
  { symbol: 'INJUSDT', baseAsset: 'INJ', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'INJ (Injective / 闪电交易所)', chineseName: '射手协议', chineseAliases: ['INJ'] },
  { symbol: 'TONUSDT', baseAsset: 'TON', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'TON (Toncoin / Telegram / 电报币 / 吨币)', chineseName: '电报币', chineseAliases: ['吨币', '电报', 'TON'] },
  { symbol: 'ARBUSDT', baseAsset: 'ARB', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ARB (Arbitrum / 二层龙头)', chineseName: '仲裁者', chineseAliases: ['二层龙头', 'ARB'] },
  { symbol: 'OPUSDT', baseAsset: 'OP', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'OP (Optimism / 乐观公链)', chineseName: '乐观', chineseAliases: ['OP'] },
  { symbol: 'POLUSDT', baseAsset: 'POL', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'POL (Polygon / 马蹄链 / 多边形)', chineseName: '马蹄链', chineseAliases: ['马蹄', '多边形', 'POL', 'MATIC'] },
  { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'MATIC (Polygon / 马蹄)', chineseName: '马蹄', chineseAliases: ['多边形', 'MATIC'] },
  { symbol: 'STRKUSDT', baseAsset: 'STRK', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'STRK (Starknet / 斯塔克)', chineseName: '斯塔克', chineseAliases: ['零知识证明', 'STRK'] },
  { symbol: 'ZKUSDT', baseAsset: 'ZK', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ZK (ZKsync Era / 时代)', chineseName: '同步时代', chineseAliases: ['ZK'] },
  { symbol: 'FTMUSDT', baseAsset: 'FTM', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'FTM / S (Fantom / Sonic / 幻影 / 音速)', chineseName: '幻影', chineseAliases: ['音速', 'FTM'] },
  { symbol: 'KASUSDT', baseAsset: 'KAS', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'KAS (Kaspa / 卡斯帕 / 幽灵协议)', chineseName: '卡斯帕', chineseAliases: ['幽灵协议', 'KAS'] },
  { symbol: 'ALGOUSDT', baseAsset: 'ALGO', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ALGO (Algorand / 算法)', chineseName: '阿尔戈', chineseAliases: ['算法', 'ALGO'] },
  { symbol: 'HBARUSDT', baseAsset: 'HBAR', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'HBAR (Hedera / 哈希图)', chineseName: '哈希图', chineseAliases: ['赫德拉', 'HBAR'] },
  { symbol: 'ATOMUSDT', baseAsset: 'ATOM', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ATOM (Cosmos / 宇宙 / 阿童木)', chineseName: '宇宙', chineseAliases: ['阿童木', 'ATOM'] },
  { symbol: 'ICPUSDT', baseAsset: 'ICP', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ICP (Internet Computer / 互联网计算机)', chineseName: '互联网计算机', chineseAliases: ['无限机', '电脑币', 'ICP'] },
  { symbol: 'MANTAUSDT', baseAsset: 'MANTA', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'MANTA (Manta Pacific / 蝠鲼)', chineseName: '蝠鲼', chineseAliases: ['MANTA'] },
  { symbol: 'ALTUSDT', baseAsset: 'ALT', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ALT (AltLayer / 模块化L2)', chineseName: '模块重构', chineseAliases: ['ALT'] },
  { symbol: 'DYMUSDT', baseAsset: 'DYM', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'DYM (Dymension / 空间维度)', chineseName: '空间维度', chineseAliases: ['DYM'] },
  { symbol: 'ZETAUSDT', baseAsset: 'ZETA', quoteAsset: 'USDT', category: 'LAYER1_2', displayName: 'ZETA (ZetaChain / 全链)', chineseName: '全链协议', chineseAliases: ['ZETA'] },

  // 5. DEFI / 去中心化金融
  { symbol: 'UNIUSDT', baseAsset: 'UNI', quoteAsset: 'USDT', category: 'DEFI', displayName: 'UNI (Uniswap / 独角兽)', chineseName: '独角兽', chineseAliases: ['UNI'] },
  { symbol: 'AAVEUSDT', baseAsset: 'AAVE', quoteAsset: 'USDT', category: 'DEFI', displayName: 'AAVE (Aave / 幽灵借贷)', chineseName: '幽灵借贷', chineseAliases: ['AAVE'] },
  { symbol: 'PENDLEUSDT', baseAsset: 'PENDLE', quoteAsset: 'USDT', category: 'DEFI', displayName: 'PENDLE (Pendle Finance / 本息分离)', chineseName: '本息分离', chineseAliases: ['盘子', 'PENDLE'] },
  { symbol: 'JUPUSDT', baseAsset: 'JUP', quoteAsset: 'USDT', category: 'DEFI', displayName: 'JUP (Jupiter Solana / 木星)', chineseName: '木星', chineseAliases: ['JUP'] },
  { symbol: 'RAYUSDT', baseAsset: 'RAY', quoteAsset: 'USDT', category: 'DEFI', displayName: 'RAY (Raydium / 射线)', chineseName: '射线', chineseAliases: ['RAY'] },
  { symbol: 'ENAUSDT', baseAsset: 'ENA', quoteAsset: 'USDT', category: 'DEFI', displayName: 'ENA (Ethena / 合成美元)', chineseName: '合成美元', chineseAliases: ['ENA'] },
  { symbol: 'MKRUSDT', baseAsset: 'MKR', quoteAsset: 'USDT', category: 'DEFI', displayName: 'MKR (Maker / 创客)', chineseName: '创客', chineseAliases: ['MKR'] },
  { symbol: 'CRVUSDT', baseAsset: 'CRV', quoteAsset: 'USDT', category: 'DEFI', displayName: 'CRV (Curve DAO / 稳定币互换)', chineseName: '曲线互换', chineseAliases: ['CRV'] },
  { symbol: 'LDOUSDT', baseAsset: 'LDO', quoteAsset: 'USDT', category: 'DEFI', displayName: 'LDO (Lido DAO / 质押龙头)', chineseName: '质押龙头', chineseAliases: ['LDO'] },
  { symbol: 'DYDXUSDT', baseAsset: 'DYDX', quoteAsset: 'USDT', category: 'DEFI', displayName: 'DYDX (dYdX / 去中心化衍生品)', chineseName: '去中心衍生品', chineseAliases: ['DYDX'] },
  { symbol: 'RUNEUSDT', baseAsset: 'RUNE', quoteAsset: 'USDT', category: 'DEFI', displayName: 'RUNE (THORChain / 雷神跨链)', chineseName: '雷神跨链', chineseAliases: ['RUNE'] },
  { symbol: 'SNXUSDT', baseAsset: 'SNX', quoteAsset: 'USDT', category: 'DEFI', displayName: 'SNX (Synthetix / 合成资产)', chineseName: '合成资产', chineseAliases: ['SNX'] },
  { symbol: 'COWUSDT', baseAsset: 'COW', quoteAsset: 'USDT', category: 'DEFI', displayName: 'COW (CoW Protocol / 奶牛协议 / 牛来)', chineseName: '奶牛协议', chineseAliases: ['牛来', '奶牛', '牛来币', '牛来usdt', '牛来USDT', '牛来了', 'COW', 'COWUSDT', '奶牛协议', '奶牛币'] },
  { symbol: 'DRIFTUSDT', baseAsset: 'DRIFT', quoteAsset: 'USDT', category: 'DEFI', displayName: 'DRIFT (Drift Protocol / 漂移协议)', chineseName: '漂移协议', chineseAliases: ['DRIFT'] },
  { symbol: '1INCHUSDT', baseAsset: '1INCH', quoteAsset: 'USDT', category: 'DEFI', displayName: '1INCH (1inch Network / 一寸聚合)', chineseName: '一寸', chineseAliases: ['1INCH'] },
  { symbol: 'COMPUSDT', baseAsset: 'COMP', quoteAsset: 'USDT', category: 'DEFI', displayName: 'COMP (Compound / 复合借贷)', chineseName: '复合借贷', chineseAliases: ['COMP'] },
  { symbol: 'SUSHIUSDT', baseAsset: 'SUSHI', quoteAsset: 'USDT', category: 'DEFI', displayName: 'SUSHI (SushiSwap / 寿司)', chineseName: '寿司', chineseAliases: ['SUSHI'] },
  { symbol: 'KAVAUSDT', baseAsset: 'KAVA', quoteAsset: 'USDT', category: 'DEFI', displayName: 'KAVA (Kava)', chineseName: '卡瓦', chineseAliases: ['KAVA'] },

  // 6. GAMEFI & 铭文 & NFT
  { symbol: 'ORDIUSDT', baseAsset: 'ORDI', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'ORDI (Ordinals / 铭文之王 / 奥丁)', chineseName: '铭文之王', chineseAliases: ['铭文', '奥丁', '奥迪', 'ORDI'] },
  { symbol: '1000SATSUSDT', baseAsset: 'SATS', quoteAsset: 'USDT', category: 'GAMEFI', displayName: '1000SATS (SATS BRC-20 / 聪铭文)', chineseName: '聪铭文', chineseAliases: ['聪', '聪币', 'SATS'], multiplier: 1000 },
  { symbol: '1000RATSUSDT', baseAsset: 'RATS', quoteAsset: 'USDT', category: 'GAMEFI', displayName: '1000RATS (RATS / 老鼠铭文)', chineseName: '老鼠铭文', chineseAliases: ['老鼠', 'RATS'], multiplier: 1000 },
  { symbol: 'GALAUSDT', baseAsset: 'GALA', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'GALA (Gala Games / 盛宴游戏)', chineseName: '盛宴游戏', chineseAliases: ['GALA'] },
  { symbol: 'SANDUSDT', baseAsset: 'SAND', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'SAND (The Sandbox / 沙盒元宇宙)', chineseName: '沙盒', chineseAliases: ['元宇宙沙盒', 'SAND'] },
  { symbol: 'MANAUSDT', baseAsset: 'MANA', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'MANA (Decentraland / 分散大陆)', chineseName: '分散大陆', chineseAliases: ['MANA'] },
  { symbol: 'AXSUSDT', baseAsset: 'AXS', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'AXS (Axie Infinity / 链游之王)', chineseName: '宠物精灵', chineseAliases: ['链游之王', 'AXS'] },
  { symbol: 'PIXELUSDT', baseAsset: 'PIXEL', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'PIXEL (Pixels Online / 像素农场)', chineseName: '像素农场', chineseAliases: ['像素', 'PIXEL'] },
  { symbol: 'BEAMXUSDT', baseAsset: 'BEAMX', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'BEAMX (Beam Gaming / 光束游戏)', chineseName: '光束游戏', chineseAliases: ['BEAMX'] },
  { symbol: 'YGGUSDT', baseAsset: 'YGG', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'YGG (Yield Guild Games / 游戏公会)', chineseName: '链游公会', chineseAliases: ['YGG'] },
  { symbol: 'BIGTIMEUSDT', baseAsset: 'BIGTIME', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'BIGTIME (Big Time / 大时代)', chineseName: '大时代', chineseAliases: ['BIGTIME'] },
  { symbol: 'PORTALUSDT', baseAsset: 'PORTAL', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'PORTAL (Portal Gaming / 传送门)', chineseName: '传送门', chineseAliases: ['PORTAL'] },
  { symbol: 'RONINUSDT', baseAsset: 'RONIN', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'RONIN (Ronin Network / 浪人侧链)', chineseName: '浪人侧链', chineseAliases: ['RONIN'] },
  { symbol: 'XAIUSDT', baseAsset: 'XAI', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'XAI (Xai Gaming L3 / XAI游戏)', chineseName: 'XAI游戏', chineseAliases: ['XAI'] },
  { symbol: 'IMXUSDT', baseAsset: 'IMX', quoteAsset: 'USDT', category: 'GAMEFI', displayName: 'IMX (Immutable X / 不可变L2)', chineseName: '不可变', chineseAliases: ['IMX'] },

  // 7. OTHER POPULAR ALTCOINS / 更多热门山寨币
  { symbol: '1000LUNCUSDT', baseAsset: 'LUNC', quoteAsset: 'USDT', category: 'OTHER', displayName: '1000LUNC (Terra Classic / 经典露娜 / 归零币)', chineseName: '经典露娜', chineseAliases: ['露娜', '归零币', 'LUNC'], multiplier: 1000 },
  { symbol: 'LUNA2USDT', baseAsset: 'LUNA2', quoteAsset: 'USDT', category: 'OTHER', displayName: 'LUNA2 (Terra 2.0 / 新露娜)', chineseName: '新露娜', chineseAliases: ['LUNA2'] },
  { symbol: 'USTCUSDT', baseAsset: 'USTC', quoteAsset: 'USDT', category: 'OTHER', displayName: 'USTC (TerraClassicUSD / 算稳)', chineseName: '经典算法稳定币', chineseAliases: ['算稳', 'USTC'] },
  { symbol: 'NEOUSDT', baseAsset: 'NEO', quoteAsset: 'USDT', category: 'OTHER', displayName: 'NEO (Neo / 小蚁币 / 中国以太坊)', chineseName: '小蚁币', chineseAliases: ['小蚁', '中国以太坊', 'NEO'] },
  { symbol: 'EOSUSDT', baseAsset: 'EOS', quoteAsset: 'USDT', category: 'OTHER', displayName: 'EOS (EOS Network / 柚子币)', chineseName: '柚子币', chineseAliases: ['柚子', 'EOS'] },
  { symbol: 'ETCUSDT', baseAsset: 'ETC', quoteAsset: 'USDT', category: 'OTHER', displayName: 'ETC (Ethereum Classic / 以太经典 / 原链)', chineseName: '以太经典', chineseAliases: ['以太原链', 'ETC'] },
  { symbol: 'ZECUSDT', baseAsset: 'ZEC', quoteAsset: 'USDT', category: 'OTHER', displayName: 'ZEC (Zcash / 大零币 / 零币)', chineseName: '大零币', chineseAliases: ['零币', 'ZEC'] },
  { symbol: 'XMRUSDT', baseAsset: 'XMR', quoteAsset: 'USDT', category: 'OTHER', displayName: 'XMR (Monero / 门罗币 / 匿名之王)', chineseName: '门罗币', chineseAliases: ['门罗', '匿名之王', 'XMR'] },
  { symbol: 'DASHUSDT', baseAsset: 'DASH', quoteAsset: 'USDT', category: 'OTHER', displayName: 'DASH (Dash / 达世币)', chineseName: '达世币', chineseAliases: ['达世', 'DASH'] },
  { symbol: 'OMUSDT', baseAsset: 'OM', quoteAsset: 'USDT', category: 'OTHER', displayName: 'OM (MANTRA RWA / 曼陀罗)', chineseName: '曼陀罗', chineseAliases: ['真实世界资产', 'OM'] },
  { symbol: 'ONDOUSDT', baseAsset: 'ONDO', quoteAsset: 'USDT', category: 'OTHER', displayName: 'ONDO (Ondo Finance RWA / 奥多金融)', chineseName: '奥多金融', chineseAliases: ['奥多', 'ONDO'] },
  { symbol: 'POLYXUSDT', baseAsset: 'POLYX', quoteAsset: 'USDT', category: 'OTHER', displayName: 'POLYX (Polymesh RWA / 多网金融)', chineseName: '多网金融', chineseAliases: ['POLYX'] },
  { symbol: 'CHZUSDT', baseAsset: 'CHZ', quoteAsset: 'USDT', category: 'OTHER', displayName: 'CHZ (Chiliz / 智利粉丝代币)', chineseName: '智利粉丝币', chineseAliases: ['粉丝代币', '足球币', 'CHZ'] },
];

// In-memory set for O(1) existence lookup
const futuresSymbolSet = new Set(PRELOADED_FUTURES_SYMBOLS.map((s) => s.symbol));
const baseAssetToFuturesMap = new Map<string, string>();

PRELOADED_FUTURES_SYMBOLS.forEach((s) => {
  baseAssetToFuturesMap.set(s.baseAsset.toUpperCase(), s.symbol);
});

// Dynamic live symbol cache loaded from Binance ExchangeInfo API
let liveFuturesSymbols: SymbolMetadata[] = [...PRELOADED_FUTURES_SYMBOLS];
let isLiveSymbolsLoaded = false;

const CACHE_KEY = 'binance_futures_symbols_cache_v8';

// Try initializing from localStorage synchronously if in browser
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const cached = window.localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 50) {
        liveFuturesSymbols = parsed;
        isLiveSymbolsLoaded = true;
        parsed.forEach((item: SymbolMetadata) => {
          futuresSymbolSet.add(item.symbol);
          baseAssetToFuturesMap.set(item.baseAsset.toUpperCase(), item.symbol);
        });
      }
    }
  }
} catch (e) {
  // Ignore localstorage errors
}

/**
 * Fetch and refresh all active Binance USDT Futures symbols dynamically
 */
export async function loadLiveBinanceFuturesSymbols(forceRefresh = false): Promise<SymbolMetadata[]> {
  if (!forceRefresh && isLiveSymbolsLoaded && liveFuturesSymbols.length > PRELOADED_FUTURES_SYMBOLS.length) {
    return liveFuturesSymbols;
  }

  const endpoints = [
    '/api/binance-futures/fapi/v1/exchangeInfo', // 1. 优先通过本服务器反向代理（走服务器自身出口 IP）
    'https://fapi.binance.com/fapi/v1/exchangeInfo', // 2. 官方直连备用
    'https://fapi.binance.vision/fapi/v1/exchangeInfo', // 3. 官方容灾节点
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      if (Array.isArray(data.symbols)) {
        const activeSymbols: SymbolMetadata[] = [];
        const seen = new Set<string>();

        for (const item of data.symbols) {
          if (item.status === 'TRADING' && item.quoteAsset === 'USDT' && item.contractType === 'PERPETUAL') {
            const sym = item.symbol;
            if (seen.has(sym)) continue;
            seen.add(sym);

            // Find if preloaded metadata has custom categorization & Chinese metadata
            const existing = PRELOADED_FUTURES_SYMBOLS.find((p) => p.symbol === sym);
            const base = item.baseAsset || sym.replace(/USDT$/, '');
            
            let category: SymbolMetadata['category'] = 'OTHER';
            let chineseName = existing?.chineseName;
            let chineseAliases = existing?.chineseAliases ? [...existing.chineseAliases] : [];

            if (existing) {
              category = existing.category;
            } else if (sym.startsWith('1000') || sym.includes('DOGE') || sym.includes('CAT') || sym.includes('INU')) {
              category = 'MEME';
            }

            // Also check CHINESE_SYMBOL_MAP for any aliases pointing to this symbol
            for (const [cnWord, mappedSym] of Object.entries(CHINESE_SYMBOL_MAP)) {
              if (mappedSym === sym) {
                if (!chineseName) chineseName = cnWord;
                if (!chineseAliases.includes(cnWord)) {
                  chineseAliases.push(cnWord);
                }
              }
            }

            activeSymbols.push({
              symbol: sym,
              baseAsset: base,
              quoteAsset: 'USDT',
              category: category,
              displayName: existing ? existing.displayName : `${sym} (${base}${chineseName ? ` / ${chineseName}` : ''})`,
              chineseName: chineseName,
              chineseAliases: chineseAliases.length > 0 ? chineseAliases : undefined,
              multiplier: sym.startsWith('1000000') ? 1000000 : sym.startsWith('1000') ? 1000 : undefined,
              onboardDate: item.onboardDate || existing?.onboardDate,
            });

            futuresSymbolSet.add(sym);
            baseAssetToFuturesMap.set(base.toUpperCase(), sym);
          }
        }

        if (activeSymbols.length > 0) {
          liveFuturesSymbols = activeSymbols;
          isLiveSymbolsLoaded = true;

          // Save to localStorage
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(CACHE_KEY, JSON.stringify(activeSymbols));
            }
          } catch (e) {
            // Ignore quota errors
          }

          return activeSymbols;
        }
      }
    } catch (e) {
      console.warn('[Binance Symbols] Failed to fetch live exchangeInfo from', url, e);
    }
  }

  return liveFuturesSymbols.length > 0 ? liveFuturesSymbols : PRELOADED_FUTURES_SYMBOLS;
}

/**
 * Symbol normalizer respecting user input:
 * - Trims whitespace (leading, trailing and inner whitespace)
 * - Converts English letters to uppercase (leaves Simplified Chinese, numbers, and symbols intact)
 * - Retains Chinese characters, digits, English uppercase letters exactly as entered without extra translation or dictionary mapping
 */
export function normalizeBinanceSymbol(
  input: unknown,
  _marketType: 'futures' | 'spot' = 'futures',
  _customSymbols?: SymbolMetadata[]
): string {
  if (!input) return 'BTCUSDT';
  
  let rawStr = '';
  if (typeof input === 'string') {
    rawStr = input;
  } else if (typeof input === 'number') {
    rawStr = String(input);
  } else if (typeof input === 'object') {
    if ('nativeEvent' in (input as any) || 'preventDefault' in (input as any)) {
      return 'BTCUSDT';
    }
    if ('target' in (input as any) && typeof (input as any).target?.value === 'string') {
      rawStr = (input as any).target.value;
    } else if ('symbol' in (input as any) && typeof (input as any).symbol === 'string') {
      rawStr = (input as any).symbol;
    } else {
      return 'BTCUSDT';
    }
  } else {
    return 'BTCUSDT';
  }

  // Remove leading/trailing whitespace and spaces
  const trimmed = rawStr.trim().replace(/\s+/g, '');
  if (!trimmed) return 'BTCUSDT';

  // Uppercase english characters while preserving Chinese, digits and existing symbols untouched
  return trimmed.toUpperCase();
}

/**
 * Fuzzy search across all active Binance symbols supporting:
 * - English symbols: 'ETH', '1000PEPE', 'PIPPIN'
 * - Chinese names: '比特币', '以太坊', '佩佩', '松鼠', '狗狗币', '大饼', '皮聘', '牛来', etc.
 */
export function searchBinanceSymbols(
  query: string,
  categoryFilter: string = 'ALL',
  allSymbols: SymbolMetadata[] = liveFuturesSymbols
): SymbolMetadata[] {
  const trimmed = (query || '').trim();
  const list = allSymbols.length > 0 ? allSymbols : PRELOADED_FUTURES_SYMBOLS;

  if (!trimmed) {
    return list.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }

  const cleanUpper = trimmed.toUpperCase();
  const cleanAlphaNum = cleanUpper.replace(/[^A-Z0-9]/g, '');
  const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);

  return list.filter((item) => {
    // Category match
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
      return false;
    }

    // Chinese query search
    if (hasChinese) {
      const trimmedNoQuote = trimmed.replace(/(?:USDT|USDC|BUSD|FDUSD|PERP|SWAP)$/i, '').trim();
      const targets = [trimmed, ...(trimmedNoQuote && trimmedNoQuote !== trimmed ? [trimmedNoQuote] : [])];

      for (const t of targets) {
        if (item.displayName.includes(t)) return true;
        if (item.chineseName && (item.chineseName.includes(t) || t.includes(item.chineseName))) return true;
        if (item.chineseAliases && item.chineseAliases.some((alias) => alias.includes(t) || t.includes(alias))) return true;

        // Check CHINESE_SYMBOL_MAP match
        for (const [cnKey, mappedSym] of Object.entries(CHINESE_SYMBOL_MAP)) {
          if ((cnKey.includes(t) || t.includes(cnKey)) && item.symbol === mappedSym) {
            return true;
          }
        }

        // Check single character match for queries with length >= 2
        if (t.length >= 2) {
          const chars = Array.from(t);
          if (item.chineseName && chars.some((c) => item.chineseName!.includes(c))) {
            return true;
          }
          if (item.chineseAliases && item.chineseAliases.some((alias) => chars.some((c) => alias.includes(c)))) {
            return true;
          }
        }
      }
    }

    // English/alphanumeric search
    if (cleanAlphaNum) {
      if (item.symbol.includes(cleanAlphaNum)) return true;
      if (item.baseAsset.toUpperCase().includes(cleanAlphaNum)) return true;
      if (item.displayName.toUpperCase().includes(cleanAlphaNum)) return true;

      // Match without 1000 multiplier
      if (item.symbol.startsWith('1000') && item.symbol.replace(/^1000/, '').includes(cleanAlphaNum)) {
        return true;
      }
      if (item.symbol.startsWith('1000000') && item.symbol.replace(/^1000000/, '').includes(cleanAlphaNum)) {
        return true;
      }
    }

    return false;
  });
}


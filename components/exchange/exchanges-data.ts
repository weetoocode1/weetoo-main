export type Exchange = {
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  logoImage?: string; // Optional field for image logos
  website: string;
  paybackRate: number;
  tradingDiscount: string;
  limitOrderFee: string;
  marketOrderFee: string;
  event: string;
  averageRebatePerUser: string;
  tags: string[];
  description?: string;
  features?: string[];
};

export const EXCHANGES: Exchange[] = [
  {
    id: "bybit",
    name: "Bybit",
    logo: "B",
    logoColor: "#F7931A",
    logoImage: "/broker/bybit.png",
    website: "bybit.com",
    paybackRate: 75,
    tradingDiscount: "15%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$2,450",
    tags: ["TOP", "LEADER"],
    description:
      "Bybit is a leading crypto derivatives exchange known for deep liquidity and fast execution. It offers advanced tools, competitive fees, and robust risk controls for active traders.",
    features: [
      "High leverage and fast execution",
      "Various futures trading options",
      "User-friendly interface",
    ],
  },
  {
    id: "okx",
    name: "OKX",
    logo: "O",
    logoColor: "#FF6B35",
    logoImage: "/broker/okx.png",
    website: "okx.com",
    paybackRate: 70,
    tradingDiscount: "12%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$2,180",
    tags: ["HIGH", "TRENDING"],
    description:
      "OKX is a world-class exchange supporting spot, futures, and options. It focuses on reliability, rich tooling, and an ecosystem of yield and DeFi products.",
    features: [
      "Stable platform with various trading tools",
      "Diverse financial products",
      "Global user base",
    ],
  },
  {
    id: "bitget",
    name: "Bitget",
    logo: "B",
    logoColor: "#00D4AA",
    logoImage: "/broker/bitget.png",
    website: "bitget.com",
    paybackRate: 65,
    tradingDiscount: "10%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$1,950",
    tags: ["PREMIUM", "FAST"],
    description:
      "Bitget is a global exchange offering futures and copy trading. It emphasizes social features, campaign rewards, and a straightforward experience for newcomers.",
    features: [
      "High payback rate and various events",
      "Copy trading functionality",
      "Support for various cryptocurrencies",
    ],
  },
  {
    id: "bingx",
    name: "BingX",
    logo: "B",
    logoColor: "#FFD93D",
    logoImage: "/broker/bingx.png",
    website: "bingx.com",
    paybackRate: 60,
    tradingDiscount: "8%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$1,680",
    tags: ["PREMIUM"],
    description:
      "BingX is an innovative exchange with social and copy-trading capabilities. It blends community insights with approachable tools and steady campaigns.",
    features: [
      "Social trading functionality",
      "High payback benefits",
      "Various trading tools",
    ],
  },
  {
    id: "deepcoin",
    name: "DeepCoin",
    logo: "D",
    logoImage: "/broker/deepcoin.png",
    logoColor: "#8B5CF6",
    website: "deepcoin.com",
    paybackRate: 55,
    tradingDiscount: "5%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$1,420",
    tags: ["BASIC"],
    description:
      "DeepCoin is a global digital asset exchange focused on professional trading. It provides steady liquidity, core derivatives, and essential risk management tools.",
    features: [
      "High payback rate",
      "Stable trading system",
      "Support for various cryptocurrencies",
    ],
  },
  {
    id: "orangex",
    name: "OrangeX",
    logo: "O",
    logoImage: "/broker/orangex.webp",
    logoColor: "#FF8C00",
    website: "orangex.com",
    paybackRate: 50,
    tradingDiscount: "3%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$1,150",
    tags: ["BASIC"],
    description:
      "OrangeX is a cryptocurrency exchange highlighting modern UX and innovative features. It targets ease of use with steady promotions and accessible markets.",
    features: [
      "Innovative trading features",
      "User-friendly platform",
      "Global accessibility",
    ],
  },
  {
    id: "blofin",
    name: "Blofin",
    logo: "B",
    logoColor: "#4F46E5",
    logoImage: "/broker/blofin.png",
    website: "blofin.com",
    paybackRate: 45,
    tradingDiscount: "2%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$980",
    tags: ["BASIC"],
    description:
      "Blofin is a derivatives-focused exchange offering a professional toolkit. It caters to active traders with analytics, margin products, and solid execution.",
    features: [
      "Derivatives trading focus",
      "Advanced trading tools",
      "Professional platform",
    ],
  },
  {
    id: "lbank",
    name: "LBank",
    logo: "L",
    logoImage: "/broker/Lbank.png",
    logoColor: "#10B981",
    website: "lbank.com",
    paybackRate: 40,
    tradingDiscount: "1%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$850",
    tags: ["BASIC"],
    description:
      "LBank is a global exchange with comprehensive spot and derivatives markets. It supports a wide range of assets and aims for consistent availability.",
    features: [
      "Comprehensive trading services",
      "Global accessibility",
      "Diverse cryptocurrency support",
    ],
  },
  {
    id: "gateio",
    name: "Gate.io",
    logo: "G",
    logoColor: "#6366F1",
    logoImage: "/broker/gate.png",
    website: "gate.io",
    paybackRate: 35,
    tradingDiscount: "0%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$720",
    tags: ["BASIC"],
    description:
      "Gate.io is known for a broad range of altcoins and steady market depth. It provides diversified products and a stable core trading experience.",
    features: ["Wide range of altcoins", "Stable platform", "Global user base"],
  },
  {
    id: "xt",
    name: "XT",
    logo: "X",
    logoColor: "#1DD1A1",
    website: "xt.com",
    paybackRate: 30,
    tradingDiscount: "0%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$650",
    tags: ["BASIC"],
    description:
      "XT is a global digital asset platform with broad asset coverage. It offers familiar trading flows and regular campaigns for engaged users.",
    features: [
      "High payback benefits",
      "Support for various altcoins",
      "Global service provision",
    ],
  },
  {
    id: "tapbit",
    name: "Tapbit",
    logo: "T",
    logoImage: "/broker/tapbit.png",
    logoColor: "#F59E0B",
    website: "tapbit.com",
    paybackRate: 25,
    tradingDiscount: "0%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$580",
    tags: ["BASIC"],
    description:
      "Tapbit is a user-friendly exchange providing core spot and derivatives markets. It focuses on accessibility, clear UI, and frequent promotional events.",
    features: [
      "User-friendly interface",
      "High payback benefits",
      "Various trading options",
    ],
  },
  {
    id: "mexc",
    name: "MEXC",
    logo: "M",
    logoColor: "#3B82F6",
    logoImage: "/broker/mexc.png",
    website: "mexc.com",
    paybackRate: 20,
    tradingDiscount: "0%",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    averageRebatePerUser: "$520",
    tags: ["BASIC"],
    description:
      "MEXC is a global exchange offering spot and futures with broad token listings. It emphasizes liquidity, responsive execution, and competitive campaigns.",
    features: [
      "Global cryptocurrency exchange",
      "Spot and futures trading",
      "Wide range of cryptocurrencies",
    ],
  },
];

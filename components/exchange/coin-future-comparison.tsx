"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Award,
  ChevronDownIcon,
  ExternalLink,
  Star,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useState } from "react";

type Exchange = {
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  website: string;
  paybackRate: number;
  tradingDiscount: string;
  limitOrderFee: string;
  marketOrderFee: string;
  event: string;
  description?: string;
  features?: string[];
};

const EXCHANGES: Exchange[] = [
  {
    id: "binance",
    name: "Binance",
    logo: "B",
    logoColor: "#F0B90B",
    website: "binance.com",
    paybackRate: 35,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "20% Deposit Credit",
    description:
      "Binance is the world's largest cryptocurrency exchange, offering a wide variety of cryptocurrencies and trading options.",
    features: [
      "Top 6 global Bitcoin trading volume exchange",
      "Registered with Korean financial services",
      "Stable leverage management guarantee system",
    ],
  },
  {
    id: "bitget",
    name: "Bitget",
    logo: "B",
    logoColor: "#00D4AA",
    website: "bitget.com",
    paybackRate: 55,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "비트겟은 글로벌 암호화폐 거래소로 선물거래와 카피트레이딩 서비스를 제공합니다.",
    features: [
      "높은 페이백률과 다양한 이벤트",
      "카피트레이딩 기능 제공",
      "다양한 암호화폐 지원",
    ],
  },
  {
    id: "okx",
    name: "OKX",
    logo: "O",
    logoColor: "#FF6B35",
    website: "okx.com",
    paybackRate: 55,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "OKX는 세계적인 암호화폐 거래소로 현물, 선물, 옵션 거래를 지원합니다.",
    features: [
      "안정적인 플랫폼과 다양한 거래 도구",
      "다양한 금융 상품 제공",
      "글로벌 사용자 기반",
    ],
  },
  {
    id: "bybit",
    name: "Bybit",
    logo: "B",
    logoColor: "#F7931A",
    website: "bybit.com",
    paybackRate: 40,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description: "바이비트는 암호화폐 파생상품 거래에 특화된 거래소입니다.",
    features: [
      "높은 레버리지와 빠른 체결 속도",
      "다양한 선물 거래 옵션",
      "사용자 친화적인 인터페이스",
    ],
  },
  {
    id: "xtcom",
    name: "XT.com",
    logo: "X",
    logoColor: "#1DD1A1",
    website: "xt.com",
    paybackRate: 70,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "XT.com은 글로벌 디지털 자산 거래 플랫폼으로 다양한 암호화폐 거래 서비스를 제공합니다.",
    features: [
      "높은 페이백 혜택",
      "다양한 알트코인 지원",
      "글로벌 서비스 제공",
    ],
  },
  {
    id: "bingx",
    name: "BingX",
    logo: "B",
    logoColor: "#FFD93D",
    website: "bingx.com",
    paybackRate: 65,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "빙엑스는 소셜 트레이딩과 카피 트레이딩 기능을 제공하는 혁신적인 암호화폐 거래소입니다.",
    features: ["소셜 트레이딩 기능", "높은 페이백 혜택", "다양한 거래 도구"],
  },
  {
    id: "deepcoin",
    name: "DeepCoin",
    logo: "D",
    logoColor: "#8B5CF6",
    website: "deepcoin.com",
    paybackRate: 70,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "딥코인은 전문적인 암호화폐 거래 서비스를 제공하는 글로벌 디지털 자산 거래소입니다.",
    features: ["높은 페이백률", "안정적인 거래 시스템", "다양한 암호화폐 지원"],
  },
  {
    id: "tapbit",
    name: "Tapbit",
    logo: "T",
    logoColor: "#F59E0B",
    website: "tapbit.com",
    paybackRate: 70,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "탭비트는 사용자 친화적인 인터페이스와 다양한 거래 옵션을 제공하는 암호화폐 거래소입니다.",
    features: [
      "사용자 친화적 인터페이스",
      "높은 페이백 혜택",
      "다양한 거래 옵션",
    ],
  },
  {
    id: "hotcoin",
    name: "HotCoin",
    logo: "H",
    logoColor: "#EF4444",
    website: "hotcoin.com",
    paybackRate: 80,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "핫코인은 높은 페이백률과 다양한 이벤트를 제공하는 글로벌 암호화폐 거래소입니다.",
    features: [
      "최고 수준의 페이백률",
      "다양한 프로모션 이벤트",
      "안정적인 거래 시스템",
    ],
  },
  {
    id: "coinex",
    name: "CoinEx",
    logo: "C",
    logoColor: "#F59E0B",
    website: "coinex.com",
    paybackRate: 60,
    tradingDiscount: "-",
    limitOrderFee: "0.024%",
    marketOrderFee: "0.045%",
    event: "입금 20% 크레딧",
    description:
      "코인엑스는 안정적이고 신뢰할 수 있는 암호화폐 거래 서비스를 제공하는 글로벌 거래소입니다.",
    features: [
      "안정적인 거래 플랫폼",
      "다양한 암호화폐 지원",
      "글로벌 서비스 제공",
    ],
  },
];

const columns: ColumnDef<Exchange>[] = [
  {
    header: "거래소",
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.getCanExpand() && (
          <Button
            className="size-7 shadow-none text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              row.getToggleExpandedHandler()();
            }}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? `접기` : `펼치기`}
            size="icon"
            variant="ghost"
          >
            <ChevronDownIcon
              className="transition-transform duration-200"
              style={{
                transform: row.getIsExpanded()
                  ? "rotate(-180deg)"
                  : "rotate(0deg)",
              }}
              size={16}
              aria-hidden="true"
            />
          </Button>
        )}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: row.original.logoColor }}
        >
          {row.original.logo}
        </div>
        <div className="font-medium">{row.getValue("name")}</div>
      </div>
    ),
  },
  {
    header: () => <div className="text-center">페이백%</div>,
    accessorKey: "paybackRate",
    cell: ({ row }) => (
      <div className="text-center">
        <span className="inline-block bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-3 py-1 rounded-full text-sm font-medium">
          {row.getValue("paybackRate")}% 페이백
        </span>
      </div>
    ),
  },
  {
    header: () => <div className="text-center">거래 할인%</div>,
    accessorKey: "tradingDiscount",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("tradingDiscount")}</div>
    ),
  },
  {
    header: () => <div className="text-center">지정가%</div>,
    accessorKey: "limitOrderFee",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("limitOrderFee")}</div>
    ),
  },
  {
    header: () => <div className="text-center">시장가%</div>,
    accessorKey: "marketOrderFee",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("marketOrderFee")}</div>
    ),
  },
  {
    header: () => <div className="text-center">이벤트</div>,
    accessorKey: "event",
    cell: ({ row }) => (
      <div className="text-center flex items-center justify-center gap-2">
        <Badge
          variant="outline"
          className="border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
        >
          {row.getValue("event")}
        </Badge>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
          <a
            href={`https://${row.original.website}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>
    ),
  },
];

// Card types and data (copied from trader-ranking.tsx)
type CardColor = "gold" | "silver" | "bronze";
type CardPosition = "left" | "center" | "right";

interface CardData {
  rank: number;
  name: string;
  username: string;
  totalReturn: number;
  portfolio: number;
  winRate: number;
  trades: number;
  winStreak: number;
  position: CardPosition;
  color: CardColor;
}

const CARD_DATA: CardData[] = [
  {
    rank: 2,
    name: EXCHANGES[1].name,
    username: `@${EXCHANGES[1].id}`,
    totalReturn: EXCHANGES[1].paybackRate,
    portfolio: 0,
    winRate: 0,
    trades: 0,
    winStreak: 0,
    position: "left",
    color: "silver",
  },
  {
    rank: 1,
    name: EXCHANGES[0].name,
    username: `@${EXCHANGES[0].id}`,
    totalReturn: EXCHANGES[0].paybackRate,
    portfolio: 986200, // Placeholder, as EXCHANGES does not have portfolio
    winRate: 79.1, // Placeholder, as EXCHANGES does not have winRate
    trades: 287, // Placeholder, as EXCHANGES does not have trades
    winStreak: 8, // Placeholder, as EXCHANGES does not have winStreak
    position: "center",
    color: "gold",
  },
  {
    rank: 3,
    name: EXCHANGES[2].name,
    username: `@${EXCHANGES[2].id}`,
    totalReturn: EXCHANGES[2].paybackRate,
    portfolio: 0,
    winRate: 0,
    trades: 0,
    winStreak: 0,
    position: "right",
    color: "bronze",
  },
];

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 100 },
  visible: (custom: number) => ({
    opacity: 1,
    scale: custom === 1 ? 1 : custom === 2 ? 0.9 : 0.85,
    y: custom === 1 ? -20 : custom === 2 ? 38 : 50,
    rotateY: custom === 2 ? 12 : custom === 3 ? -12 : 0,
    z: custom === 1 ? 0 : custom === 2 ? -80 : -120,
    transition: {
      duration: 0.5,
      delay: custom === 1 ? 0.1 : custom === 2 ? 0.4 : 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

import { memo, useMemo } from "react";
const TraderCard = memo(
  ({ data, exchange }: { data: CardData; exchange?: Exchange }) => {
    const cardStyles = useMemo(() => {
      const baseStyles = {
        boxShadow: "",
        backgroundImage: "",
        border: "none",
      };
      switch (data.color) {
        case "gold":
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 2px #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.15)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.08), transparent 40%)",
          };
        case "silver":
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 1.5px #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.05), transparent 40%)",
          };
        case "bronze":
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 1.5px #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.05), transparent 40%)",
          };
        default:
          return baseStyles;
      }
    }, [data.color]);

    const reflectionStyles = useMemo(() => {
      const baseReflection = {
        transform: "scaleY(-1)",
        borderRadius: "0 0 16px 16px",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        opacity: 0.45,
        blur: "blur(2px)",
        boxShadow: "none",
        backgroundImage: "none",
        top: "510px",
        width: "20rem",
        height: "150px",
      };
      switch (data.color) {
        case "gold":
          return {
            ...baseReflection,
            boxShadow:
              "2px 0 0 0 #f59e0b, -2px 0 0 0 #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.3)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.05), transparent 30%)",
            top: "540px",
            width: "24rem",
            height: "180px",
          };
        case "silver":
          return {
            ...baseReflection,
            transform: "scaleY(-1) rotateY(12deg)",
            boxShadow:
              "1.5px 0 0 0 #cbd5e1, -1.5px 0 0 0 #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.03), transparent 30%)",
            top: "510px",
            width: "20rem",
            height: "150px",
          };
        case "bronze":
          return {
            ...baseReflection,
            transform: "scaleY(-1) rotateY(-12deg)",
            boxShadow:
              "1.5px 0 0 0 #f97316, -1.5px 0 0 0 #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.03), transparent 30%)",
            top: "510px",
            width: "20rem",
            height: "150px",
          };
        default:
          return baseReflection;
      }
    }, [data.color]);

    const cardSize = data.rank === 1 ? "w-96 h-[520px]" : "w-80 h-[490px]";
    const padding = data.rank === 1 ? "p-7" : "p-6";

    return (
      <motion.div
        className="relative group"
        custom={data.rank}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        style={{
          transform: `rotateY(${
            data.rank === 2 ? "12deg" : data.rank === 3 ? "-12deg" : "0deg"
          }) translateZ(${
            data.rank === 1 ? "0px" : data.rank === 2 ? "-80px" : "-120px"
          }) translateY(${
            data.rank === 1 ? "-20px" : data.rank === 2 ? "38px" : "50px"
          }) scale(${
            data.rank === 1 ? "1" : data.rank === 2 ? "0.9" : "0.85"
          })`,
        }}
      >
        <div
          className={`${cardSize} rounded-2xl shadow-lg overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}
          style={cardStyles}
        >
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
          <div className="absolute inset-0 opacity-15 bg-gradient-to-tl from-white/10 via-transparent to-white/5" />
          <div className={`relative z-10 h-full ${padding} flex flex-col`}>
            <div className="flex items-start justify-between mb-6">
              <Badge
                className={
                  data.rank === 1
                    ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/60 px-4 py-2.5 text-base font-bold shadow-lg"
                    : data.rank === 2
                    ? "bg-slate-200/10 text-slate-200 border border-slate-400/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                    : "bg-amber-700/20 text-amber-300 border border-amber-500/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                }
              >
                {data.rank === 1 ? (
                  <Award className="w-5 h-5 mr-2" />
                ) : data.rank === 2 ? (
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                )}
                #{data.rank}
              </Badge>
              <div className="text-right">
                <div
                  className={`${
                    data.rank === 1
                      ? "text-emerald-300 text-3xl"
                      : "text-emerald-400 text-2xl"
                  } font-bold`}
                >
                  +{data.totalReturn}%
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {data.rank === 1 || data.rank === 2 || data.rank === 3
                    ? "Payback Rate"
                    : "Total Return"}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center ${
                data.rank === 1 ? "gap-4 mb-6" : "gap-3 mb-5"
              }`}
            >
              <Avatar
                className={`${
                  data.rank === 1 ? "w-16 h-16" : "w-14 h-14"
                } ring-2 ${
                  data.color === "gold"
                    ? "ring-yellow-400/30"
                    : data.color === "silver"
                    ? "ring-slate-400/20"
                    : "ring-amber-500/20"
                }`}
              >
                <AvatarImage src={``} alt={data.name} />
                <AvatarFallback
                  className={
                    data.color === "gold"
                      ? "bg-yellow-500/20 text-yellow-300 text-xl font-bold"
                      : data.color === "silver"
                      ? "bg-slate-500/20 text-slate-300 font-semibold text-lg"
                      : "bg-amber-600/20 text-amber-300 font-semibold text-lg"
                  }
                >
                  {data.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3
                  className={`${
                    data.rank === 1 ? "text-2xl" : "text-xl"
                  } font-bold text-foreground`}
                >
                  {data.name}
                </h3>
                <p className="text-sm text-muted-foreground">{data.username}</p>
              </div>
            </div>

            {(data.rank === 1 || data.rank === 2 || data.rank === 3) &&
            exchange ? (
              <div className="space-y-3 flex-1 mt-4">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    Payback Rate
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.paybackRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    Trading Discount
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.tradingDiscount}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    Limit Order Fee
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.limitOrderFee}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    Market Order Fee
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.marketOrderFee}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-muted-foreground">
                    Event
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.event}
                  </span>
                </div>
              </div>
            ) : (
              <Button
                className={`w-full mb-5 ${
                  data.color === "silver"
                    ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-100 border border-slate-400/50 font-semibold h-10 shadow-sm hover:shadow-md"
                    : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/50 font-semibold h-10 shadow-sm hover:shadow-md"
                } transition-all duration-300`}
                variant="outline"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Follow Trader
              </Button>
            )}
          </div>
        </div>
        {/* Reflection */}
        <div
          className="absolute left-0 overflow-hidden"
          style={{
            top: reflectionStyles.top || "510px",
            width: reflectionStyles.width === "96" ? "24rem" : "20rem",
            height: reflectionStyles.height || "150px",
            transform: reflectionStyles.transform,
            borderRadius: reflectionStyles.borderRadius,
            clipPath: reflectionStyles.clipPath,
            boxShadow: reflectionStyles.boxShadow,
            opacity: reflectionStyles.opacity,
            backgroundImage: reflectionStyles.backgroundImage,
            filter: "blur(2px)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.2) 25%, transparent 65%)",
            }}
          />
        </div>
      </motion.div>
    );
  }
);
TraderCard.displayName = "TraderCard";

export const CoinFuturesComparison = () => {
  const [, setHoveredRow] = useState<string | null>(null);

  const table = useReactTable({
    data: EXCHANGES,
    columns,
    getRowCanExpand: (row) => Boolean(row.original.description),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="w-full">
      {/* Top 3 Trader Cards Section */}
      <div
        className="relative min-h-[700px] flex items-center justify-center gap-12 px-8 mb-16"
        style={{ perspective: "1200px" }}
      >
        {CARD_DATA.map((cardData) =>
          cardData.rank === 1 ? (
            <TraderCard
              key={cardData.rank}
              data={cardData}
              exchange={EXCHANGES[0]}
            />
          ) : cardData.rank === 2 ? (
            <TraderCard
              key={cardData.rank}
              data={cardData}
              exchange={EXCHANGES[1]}
            />
          ) : cardData.rank === 3 ? (
            <TraderCard
              key={cardData.rank}
              data={cardData}
              exchange={EXCHANGES[2]}
            />
          ) : null
        )}
      </div>
      {/* Table Section */}
      <div className="border border-border rounded-lg overflow-hidden mt-28">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-b border-border"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-transparent border-r border-border last:border-r-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer border-b border-border"
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="whitespace-nowrap border-r border-border last:border-r-0"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  <AnimatePresence>
                    {row.getIsExpanded() && (
                      <tr>
                        <td
                          colSpan={row.getVisibleCells().length}
                          className="p-0 border-0"
                        >
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden border-b border-border"
                          >
                            <div className="p-6 bg-muted/30">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-3">
                                    {row.original.name} 상세 정보
                                  </h4>
                                  <p className="text-sm mb-4">
                                    {row.original.description}
                                  </p>
                                  <div className="space-y-2">
                                    {row.original.features?.map(
                                      (feature, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center gap-2"
                                        >
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <span className="text-sm">
                                            {feature}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col justify-center items-end">
                                  <div className="space-y-3 w-full max-w-xs">
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                    >
                                      간편 UID 등록
                                    </Button>
                                    <Button
                                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                                      asChild
                                    >
                                      <a
                                        href={`https://${row.original.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        가입하기{" "}
                                        <ExternalLink className="w-4 h-4 ml-2" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

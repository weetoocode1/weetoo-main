import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  DollarSign,
  Minus,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React, { useMemo } from "react";
import {
  getDummyUsers,
  getDummyDonationUsers,
  getDummyFollowersUsers,
} from "@/lib/dummy-users";
import type { RankingsData } from "@/lib/data/rankings-data";

// Leaderboard entry interface
interface LeaderboardEntry {
  id: string | number;
  rank: number;
  name: string;
  avatar: string;
  score: number;
  change: number;
  category: string;
}

// Leaderboard category interface
interface LeaderboardCategory {
  id: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  entries: LeaderboardEntry[];
}

// Import types from the server-side data file
type TraderData = RankingsData["returnRateData"][0];
type ActivityData = RankingsData["activityData"][0];
type DonationData = RankingsData["donationData"][0];
type FollowersData = RankingsData["followersData"][0];

// Category meta for small detail label and unit handling - will be updated with translations
const getCategoryMeta = (
  t: (key: string) => string
): Record<string, { label: string; unit: string; desc: string }> => ({
  winrate: {
    label: `${t("winRate")} (%)`,
    unit: "%",
    desc: "Winning trades over total trades",
  },
  profitrate: {
    label: `${t("profitRate")} (%)`,
    unit: "%",
    desc: "Return relative to initial capital",
  },
  activity: {
    label: `${t("activityXp")} (Exp)`,
    unit: "Exp",
    desc: "Experience points from daily activity",
  },
  sponsored: {
    label: `${t("sponsored")} (${t("korCoins")})`,
    unit: "Kor",
    desc: "Kor-coins earned via sponsorships",
  },
  followers: {
    label: `${t("mostFollowed")} (Followers)`,
    unit: "Followers",
    desc: "Total followers across the platform",
  },
});

type CategoryId =
  | "winrate"
  | "profitrate"
  | "activity"
  | "sponsored"
  | "followers";
type LeaderItem = TraderData | ActivityData | DonationData | FollowersData;

// Helper function to convert real data to leaderboard entries
const convertToLeaderboardEntries = (
  data: LeaderItem[],
  category: CategoryId,
  maxEntries: number = 5
): LeaderboardEntry[] => {
  return data
    .filter((item) => {
      // Filter out items with zero or invalid scores
      let score = 0;
      switch (category) {
        case "winrate":
          score = (item as TraderData).win_rate || 0;
          break;
        case "profitrate":
          score = (item as TraderData).total_return || 0;
          break;
        case "activity":
          score = (item as ActivityData).total_exp || 0;
          break;
        case "sponsored":
          score = (item as DonationData).total_donation || 0;
          break;
        case "followers":
          score = (item as FollowersData).total_followers || 0;
          break;
      }
      return score > 0; // Only include entries with positive scores
    })
    .slice(0, maxEntries)
    .map((item, index) => {
      let score = 0;
      let change = 0; // Mock change data for now

      // Use deterministic change values based on index to prevent hydration mismatches
      const changeValues = [
        [1.5, -2.1, 0.8, -1.3, 2.7], // winrate changes
        [12.5, -5.2, 8.9, -3.1, 6.3], // profitrate changes
        [8.2, -2.5, 4.7, -1.8, 3.2], // activity changes
        [15.3, -7.2, 9.8, -4.1, 6.5], // sponsored changes
        [18.7, -3.4, 11.2, -2.8, 7.9], // followers changes
      ];

      const categoryIndex = [
        "winrate",
        "profitrate",
        "activity",
        "sponsored",
        "followers",
      ].indexOf(category);
      const changeArray = changeValues[categoryIndex] || [0, 0, 0, 0, 0];
      change = changeArray[index] || 0;

      switch (category) {
        case "winrate":
          score = (item as TraderData).win_rate || 0;
          break;
        case "profitrate":
          score = (item as TraderData).total_return || 0;
          break;
        case "activity":
          score = (item as ActivityData).total_exp || 0;
          break;
        case "sponsored":
          score = (item as DonationData).total_donation || 0;
          break;
        case "followers":
          score = (item as FollowersData).total_followers || 0;
          break;
      }

      return {
        id: `${category}-${item.id || index + 1}`, // Make ID unique by prefixing with category
        rank: index + 1,
        name: item.nickname || `User ${index + 1}`,
        avatar:
          item.avatar_url ||
          `https://images.unsplash.com/photo-${
            1472099645785 + index
          }?w=150&h=150&fit=crop&crop=face`,
        score,
        change,
        category,
      };
    });
};

// Helper chips & common UI
const ChangeChip = ({ value }: { value: number }) => (
  <span
    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm text-[11px] tabular-nums ${
      value > 0
        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
        : value < 0
        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        : "bg-muted text-muted-foreground"
    }`}
  >
    {value > 0 ? (
      <ArrowUp className="w-3 h-3" />
    ) : value < 0 ? (
      <ArrowDown className="w-3 h-3" />
    ) : (
      <Minus className="w-3 h-3" />
    )}
    <span>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  </span>
);

// Rank chip now uses softer, muted colors for 1–3
const RankChip = ({ rank }: { rank: number }) => {
  const base = "inline-flex items-center justify-center rounded-full";
  if (rank === 1)
    return (
      <span
        className={`${base} w-6 h-6 bg-yellow-200 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300`}
      >
        <Trophy className="w-3.5 h-3.5" />
      </span>
    );
  if (rank === 2)
    return (
      <span
        className={`${base} w-6 h-6 bg-zinc-200 text-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300`}
      >
        <Trophy className="w-3.5 h-3.5" />
      </span>
    );
  if (rank === 3)
    return (
      <span
        className={`${base} w-6 h-6 bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300`}
      >
        <Trophy className="w-3.5 h-3.5" />
      </span>
    );
  // 4th and 5th: small numeric chip, muted
  return (
    <span
      className={`${base} w-6 h-6 bg-muted text-muted-foreground text-[10px] font-bold`}
    >
      {rank}
    </span>
  );
};

// Unified Spotlight entry for any rank (compact card)
const SpotlightEntry = ({
  entry,
  striped = false,
}: {
  entry: LeaderboardEntry;
  striped?: boolean;
}) => {
  const formatScore = (score: number, category: string) => {
    if (category === "profitrate") return `${score.toFixed(1)}%`;
    if (category === "winrate") return `${score.toFixed(1)}%`;
    if (category === "activity") return `${Math.round(score)} Exp`;
    if (category === "sponsored")
      return `${new Intl.NumberFormat().format(score)} Kor`;
    if (category === "followers")
      return `${new Intl.NumberFormat().format(score)}`;
    return `${score}`;
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-md border border-border ${
        striped ? "bg-muted/25" : "bg-muted/15"
      }`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20%" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.01 }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120px 60px at 0% 0%, var(--primary)/6 0%, transparent 60%), radial-gradient(120px 60px at 100% 100%, var(--primary)/6 0%, transparent 60%)",
        }}
      />
      <div className="relative flex items-center justify-between p-3">
        <div className="flex items-center space-x-3 min-w-0">
          <RankChip rank={entry.rank} />
          <Avatar className="w-9 h-9">
            <AvatarImage src={entry.avatar} alt={entry.name} />
            <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
              {entry.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">
              {entry.name}
            </p>
            <div className="flex items-center space-x-2 text-[12px] mt-0.5">
              <span className="font-bold text-foreground tabular-nums">
                {formatScore(entry.score, entry.category)}
              </span>
              <ChangeChip value={entry.change} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Route mapping for each category
const categoryRoutes: Record<string, string> = {
  winrate: "/ranking",
  profitrate: "/profit-rate",
  activity: "/most-activity",
  sponsored: "/sponsored",
  followers: "/most-followed",
};

// Leaderboard Category Component – all entries use Spotlight style
const LeaderboardCategoryComponent = ({
  category,
  entries,
}: {
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
}) => {
  const IconComponent = category.icon;
  const t = useTranslations("rankings");
  const categoryMeta = getCategoryMeta(t);
  const meta = categoryMeta[category.id];
  const route = categoryRoutes[category.id] || "/ranking";

  return (
    <motion.div
      className="relative bg-card rounded-xl border border-border/80 overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header with tasteful detailing */}
      <div className="relative px-4 py-3 border-b border-border bg-gradient-to-b from-muted/30 to-muted/10 overflow-hidden">
        {/* soft glows */}
        <span className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-primary/5 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-12 -left-12 w-20 h-20 rounded-full bg-chart-1/5 blur-2xl" />
        {/* watermark icon with softer opacity */}
        <IconComponent className="pointer-events-none absolute right-3 top-2.5 w-10 h-10 text-muted-foreground/5" />

        <div className="relative flex items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              {category.title}
            </h3>
            {meta && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {meta.label}
              </p>
            )}
            {/* animated underline */}
            <motion.div
              className="mt-1 h-px w-12 bg-gradient-to-r from-primary/50 to-transparent"
              initial={{ width: 0, opacity: 0 }}
              whileInView={{ width: 48, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
      <div className="p-2 space-y-2">
        {entries.map((entry, idx) => (
          <SpotlightEntry
            key={entry.id}
            entry={entry}
            striped={idx % 2 === 1}
          />
        ))}
      </div>

      {/* View Leaderboard Button */}
      <div className="px-2.5 pb-3">
        <Link href={route}>
          <motion.button
            className="w-full py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-muted/30 rounded-lg cursor-pointer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {t("viewFullLeaderboard")} →
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
};

interface RankingsSectionProps {
  data: RankingsData;
}

export function RankingsSection({ data }: RankingsSectionProps) {
  const t = useTranslations("rankings");

  // Convert real data to leaderboard entries with proper fallback to mock data
  const leaderboardData = useMemo(() => {
    // Mock data for fallback with unique IDs (excluding activity which should use real data)
    const mockData = {
      winrate: [
        {
          id: "mock-winrate-1",
          rank: 1,
          name: "CryptoKing",
          avatar:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          score: 94.8,
          change: 1.5,
          category: "winrate",
        },
        {
          id: "mock-winrate-2",
          rank: 2,
          name: "EtherMaster",
          avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          score: 92.3,
          change: 0.9,
          category: "winrate",
        },
        {
          id: "mock-winrate-3",
          rank: 3,
          name: "DeFiExpert",
          avatar:
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
          score: 89.6,
          change: -0.8,
          category: "winrate",
        },
        {
          id: "mock-winrate-4",
          rank: 4,
          name: "AltcoinPro",
          avatar:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
          score: 87.4,
          change: 1.1,
          category: "winrate",
        },
        {
          id: "mock-winrate-5",
          rank: 5,
          name: "TokenTitan",
          avatar:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
          score: 85.1,
          change: -0.2,
          category: "winrate",
        },
      ],
      profitrate: [
        {
          id: "mock-profitrate-1",
          rank: 1,
          name: "ProfitPioneer",
          avatar:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
          score: 12500,
          change: 3.2,
          category: "profitrate",
        },
        {
          id: "mock-profitrate-2",
          rank: 2,
          name: "WealthWizard",
          avatar:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
          score: 11800,
          change: 2.8,
          category: "profitrate",
        },
        {
          id: "mock-profitrate-3",
          rank: 3,
          name: "MarketMaestro",
          avatar:
            "https://images.unsplash.com/photo-1502823403499-6ccfcf4cf687?w=150&h=150&fit=crop&crop=face",
          score: 10500,
          change: -1.1,
          category: "profitrate",
        },
        {
          id: "mock-profitrate-4",
          rank: 4,
          name: "BullishBob",
          avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          score: 9800,
          change: 1.9,
          category: "profitrate",
        },
        {
          id: "mock-profitrate-5",
          rank: 5,
          name: "BearishBetty",
          avatar:
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
          score: 9100,
          change: -0.5,
          category: "profitrate",
        },
      ],
      sponsored: [
        {
          id: "mock-sponsored-1",
          rank: 1,
          name: "SponsorStar",
          avatar:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
          score: 10000,
          change: 10.0,
          category: "sponsored",
        },
        {
          id: "mock-sponsored-2",
          rank: 2,
          name: "AdAmbassador",
          avatar:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
          score: 9500,
          change: 8.0,
          category: "sponsored",
        },
        {
          id: "mock-sponsored-3",
          rank: 3,
          name: "BrandBuilder",
          avatar:
            "https://images.unsplash.com/photo-1502823403499-6ccfcf4cf687?w=150&h=150&fit=crop&crop=face",
          score: 9000,
          change: -5.0,
          category: "sponsored",
        },
        {
          id: "mock-sponsored-4",
          rank: 4,
          name: "PromoPro",
          avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          score: 8500,
          change: 3.0,
          category: "sponsored",
        },
        {
          id: "mock-sponsored-5",
          rank: 5,
          name: "CoinCreator",
          avatar:
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
          score: 8000,
          change: -2.0,
          category: "sponsored",
        },
      ],
      followers: [
        {
          id: "mock-followers-1",
          rank: 1,
          name: "SocialGuru",
          avatar:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
          score: 15000,
          change: 2.5,
          category: "followers",
        },
        {
          id: "mock-followers-2",
          rank: 2,
          name: "CommunityKing",
          avatar:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
          score: 14000,
          change: 2.0,
          category: "followers",
        },
        {
          id: "mock-followers-3",
          rank: 3,
          name: "InfluenceIcon",
          avatar:
            "https://images.unsplash.com/photo-1502823403499-6ccfcf4cf687?w=150&h=150&fit=crop&crop=face",
          score: 13000,
          change: -1.0,
          category: "followers",
        },
        {
          id: "mock-followers-4",
          rank: 4,
          name: "FanFavorite",
          avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          score: 12000,
          change: 1.5,
          category: "followers",
        },
        {
          id: "mock-followers-5",
          rank: 5,
          name: "TrendSetter",
          avatar:
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
          score: 11000,
          change: -0.8,
          category: "followers",
        },
      ],
    };

    const processCategory = (
      categoryId: CategoryId,
      realData: LeaderItem[],
      icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
      title: string
    ): LeaderboardCategory => {
      // Special handling for activity category - use real data with dummy fallback like most-activity-ranking.tsx
      if (categoryId === "activity") {
        const realEntries = convertToLeaderboardEntries(realData, categoryId)
          .filter((entry) => entry.score > 0)
          .reduce((acc, entry) => {
            // Remove duplicates based on user name
            const existing = acc.find((e) => e.name === entry.name);
            if (!existing) {
              acc.push(entry);
            }
            return acc;
          }, [] as LeaderboardEntry[]);

        // If we have real data, use it; otherwise use dummy data
        if (realEntries.length > 0) {
          // Fill up to 5 entries with real data, then dummy data if needed
          const filledEntries = [...realEntries];

          // Use getDummyUsers for fallback
          const dummyUsers = getDummyUsers("weekly"); // Use weekly timeframe to match the API

          // Convert dummy users to leaderboard entries
          const dummyEntries = dummyUsers.map((user, index) => ({
            id: `dummy-activity-${index + 1}`,
            rank: filledEntries.length + index + 1,
            name: user.nickname,
            avatar:
              user.avatar_url ||
              `https://images.unsplash.com/photo-${
                1472099645785 + index
              }?w=150&h=150&fit=crop&crop=face`,
            score: user.total_exp || 0,
            change: 0, // Dummy data has no change
            category: "activity",
          }));

          // Fill remaining slots with dummy data (avoiding duplicates with real data)
          const usedNames = new Set(filledEntries.map((e) => e.name));
          let dummyIndex = 0;

          while (filledEntries.length < 5 && dummyIndex < dummyEntries.length) {
            const dummyEntry = dummyEntries[dummyIndex];
            if (!usedNames.has(dummyEntry.name)) {
              filledEntries.push({
                ...dummyEntry,
                rank: filledEntries.length + 1,
              });
              usedNames.add(dummyEntry.name);
            }
            dummyIndex++;
          }

          return {
            id: categoryId,
            title,
            icon,
            entries: filledEntries.slice(0, 5), // Always exactly 5 entries
          };
        } else {
          // No real data, use dummy data only
          const dummyUsers = getDummyUsers("weekly");
          const dummyEntries = dummyUsers.slice(0, 5).map((user, index) => ({
            id: `dummy-activity-${index + 1}`,
            rank: index + 1,
            name: user.nickname,
            avatar:
              user.avatar_url ||
              `https://images.unsplash.com/photo-${
                1472099645785 + index
              }?w=150&h=150&fit=crop&crop=face`,
            score: user.total_exp || 0,
            change: 0,
            category: "activity",
          }));

          return {
            id: categoryId,
            title,
            icon,
            entries: dummyEntries,
          };
        }
      }

      // For other categories, use real data with appropriate dummy fallback
      const realEntries = convertToLeaderboardEntries(realData, categoryId)
        .filter((entry) => entry.score > 0)
        .reduce((acc, entry) => {
          // Remove duplicates based on user name
          const existing = acc.find((e) => e.name === entry.name);
          if (!existing) {
            acc.push(entry);
          }
          return acc;
        }, [] as LeaderboardEntry[]);

      // Fill up to 5 entries with real data, then dummy data if needed
      const filledEntries = [...realEntries];

      // Get appropriate dummy data based on category
      let dummyEntries: LeaderboardEntry[] = [];

      if (categoryId === "sponsored") {
        const dummyUsers = getDummyDonationUsers("weekly");
        dummyEntries = dummyUsers.map((user, index) => ({
          id: `dummy-sponsored-${index + 1}`,
          rank: filledEntries.length + index + 1,
          name: user.nickname,
          avatar:
            user.avatar_url ||
            `https://images.unsplash.com/photo-${
              1472099645785 + index
            }?w=150&h=150&fit=crop&crop=face`,
          score: user.total_donation || 0,
          change: 0, // Dummy data has no change
          category: "sponsored",
        }));
      } else if (categoryId === "followers") {
        const dummyUsers = getDummyFollowersUsers("weekly");
        dummyEntries = dummyUsers.map((user, index) => ({
          id: `dummy-followers-${index + 1}`,
          rank: filledEntries.length + index + 1,
          name: user.nickname,
          avatar:
            user.avatar_url ||
            `https://images.unsplash.com/photo-${
              1472099645785 + index
            }?w=150&h=150&fit=crop&crop=face`,
          score: user.total_followers || 0,
          change: 0, // Dummy data has no change
          category: "followers",
        }));
      } else if (categoryId === "winrate" || categoryId === "profitrate") {
        // For win rate and profit rate, use mock data from the existing mockData
        const mockEntries = mockData[categoryId as keyof typeof mockData] || [];
        dummyEntries = mockEntries.map((entry, index) => ({
          ...entry,
          id: `dummy-${categoryId}-${index + 1}`,
          rank: filledEntries.length + index + 1,
        }));
      }

      // Fill remaining slots with dummy data (avoiding duplicates with real data)
      const usedNames = new Set(filledEntries.map((e) => e.name));
      let dummyIndex = 0;

      while (filledEntries.length < 5 && dummyIndex < dummyEntries.length) {
        const dummyEntry = dummyEntries[dummyIndex];
        if (!usedNames.has(dummyEntry.name)) {
          filledEntries.push({
            ...dummyEntry,
            rank: filledEntries.length + 1,
          });
          usedNames.add(dummyEntry.name);
        }
        dummyIndex++;
      }

      return {
        id: categoryId,
        title,
        icon,
        entries: filledEntries.slice(0, 5), // Always exactly 5 entries
      };
    };

    const categories: LeaderboardCategory[] = [
      processCategory(
        "winrate",
        data.returnRateData,
        TrendingUp,
        `${t("winRate")}`
      ),
      processCategory(
        "profitrate",
        data.virtualMoneyData,
        BarChart3,
        `${t("profitRate")}`
      ),
      processCategory("activity", data.activityData, Zap, `${t("activityXp")}`),
      processCategory(
        "sponsored",
        data.donationData,
        DollarSign,
        `${t("sponsored")}`
      ),
      processCategory(
        "followers",
        data.followersData,
        Users,
        `${t("mostFollowed")}`
      ),
    ];

    return categories;
  }, [data, t]);

  return (
    <section className="bg-background relative py-24 px-4 md:px-0">
      {/* Subtle backdrop similar to hero */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-chart-1/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1700px] mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
            {t("leaderboards")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mt-2">
            {t("trackTopTraders")}
          </p>
        </motion.div>

        {/* All Leaderboards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {leaderboardData.map((category) => (
            <LeaderboardCategoryComponent
              key={category.id}
              category={category}
              entries={category.entries}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

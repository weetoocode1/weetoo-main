"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Post, PostAuthor, User } from "@/types/post";
import { MessageSquare, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

// Post data structure
interface PostData {
  id: string | number; // String for real data (UUID), number for demo data
  title: string;
  content: string;
  author: string;
  authorAvatar: string;
  publishDate: string;
  readTime: string;
  likes: number;
  comments: number;
  category: "Free Board" | "Education Board" | "Profit Board";
  isTrending?: boolean;
  isPinned?: boolean;
  isDemo?: boolean;
  boardPath?: string; // For demo data: full path like "/free-board", for real data: board parameter like "free-board"
}

interface CommunityBoardsSectionProps {
  boardData: {
    "free-board": Post[];
    "education-board": Post[];
    "profit-board": Post[];
  };
}

// Demo data for fallback
const demoPostsData: PostData[] = [
  // Free Board Posts
  {
    id: 1,
    title: "Market Analysis: Bitcoin's Next Move",
    content:
      "Comprehensive analysis of Bitcoin's current market position and potential breakout scenarios based on technical indicators and market sentiment.",
    author: "CryptoAnalyst",
    authorAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-15",
    readTime: "5 min read",
    likes: 1247,
    comments: 89,
    category: "Free Board",
    isTrending: true,
    isDemo: true,
    boardPath: "/free-board",
  },
  {
    id: 2,
    title: "Trading Psychology: Managing Emotions",
    content:
      "Essential strategies for maintaining emotional discipline during volatile market conditions and making rational trading decisions.",
    author: "TradingGuru",
    authorAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-14",
    readTime: "7 min read",
    likes: 892,
    comments: 56,
    category: "Free Board",
    isDemo: true,
    boardPath: "/free-board",
  },
  {
    id: 3,
    title: "DeFi Opportunities in 2024",
    content:
      "Exploring emerging DeFi protocols and yield farming opportunities that could provide significant returns in the current market cycle.",
    author: "DeFiExplorer",
    authorAvatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-13",
    readTime: "6 min read",
    likes: 1156,
    comments: 73,
    category: "Free Board",
    isDemo: true,
    boardPath: "/free-board",
  },
  // Education Board Posts
  {
    id: 4,
    title: "Complete Guide to Technical Analysis",
    content:
      "Master the fundamentals of technical analysis with practical examples, chart patterns, and indicator strategies for successful trading.",
    author: "ChartMaster",
    authorAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-15",
    readTime: "12 min read",
    likes: 2156,
    comments: 134,
    category: "Education Board",
    isPinned: true,
    isDemo: true,
    boardPath: "/education-board",
  },
  {
    id: 5,
    title: "Risk Management Fundamentals",
    content:
      "Learn essential risk management techniques including position sizing, stop-loss strategies, and portfolio diversification methods.",
    author: "RiskExpert",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-14",
    readTime: "9 min read",
    likes: 1834,
    comments: 98,
    category: "Education Board",
    isDemo: true,
    boardPath: "/education-board",
  },
  {
    id: 6,
    title: "Blockchain Technology Explained",
    content:
      "Understanding the underlying technology behind cryptocurrencies and how blockchain networks operate in simple, accessible terms.",
    author: "BlockchainPro",
    authorAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-13",
    readTime: "10 min read",
    likes: 1678,
    comments: 87,
    category: "Education Board",
    isDemo: true,
    boardPath: "/education-board",
  },
  // Profit Board Posts
  {
    id: 7,
    title: "High-Yield Trading Strategy",
    content:
      "Advanced trading strategy that has generated consistent 25% monthly returns using sophisticated market timing and position management.",
    author: "ProfitKing",
    authorAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-15",
    readTime: "8 min read",
    likes: 3245,
    comments: 156,
    category: "Profit Board",
    isTrending: true,
    isDemo: true,
    boardPath: "/profit-board",
  },
  {
    id: 8,
    title: "Institutional Trading Secrets",
    content:
      "Insider knowledge from institutional traders about large-scale trading operations and how retail traders can adapt these strategies.",
    author: "InstitutionalInsider",
    authorAvatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-14",
    readTime: "11 min read",
    likes: 2891,
    comments: 203,
    category: "Profit Board",
    isDemo: true,
    boardPath: "/profit-board",
  },
  {
    id: 9,
    title: "Portfolio Optimization Techniques",
    content:
      "Mathematical approaches to portfolio optimization that maximize returns while minimizing risk through advanced statistical methods.",
    author: "QuantTrader",
    authorAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    publishDate: "2024-01-13",
    readTime: "13 min read",
    likes: 2567,
    comments: 178,
    category: "Profit Board",
    isDemo: true,
    boardPath: "/profit-board",
  },
];

// Convert real Post data to PostData format
const convertToPostData = (
  post: Post,
  category: "Free Board" | "Education Board" | "Profit Board"
): PostData => {
  type ExtendedAuthor = PostAuthor | User;

  const isUserAuthor = (author: ExtendedAuthor): author is User => {
    return (
      (author as User).first_name !== undefined ||
      (author as User).last_name !== undefined ||
      (author as User).avatar_url !== undefined
    );
  };

  type MaybeCreatedAt = { created_at?: string };
  // Map category to board parameter (without leading slash)
  const getBoardParam = (cat: string) => {
    switch (cat) {
      case "Free Board":
        return "free-board";
      case "Education Board":
        return "education-board";
      case "Profit Board":
        return "profit-board";
      default:
        return "free-board";
    }
  };

  // Format author name properly - handle both API response and PostAuthor interface
  const getAuthorName = () => {
    const author = post.author as ExtendedAuthor;
    if (!author) {
      return "Anonymous";
    }
    if (isUserAuthor(author) && author.first_name && author.last_name) {
      return `${author.first_name} ${author.last_name}`;
    }
    if (!isUserAuthor(author) && author.name) {
      return author.name;
    }
    if (!isUserAuthor(author) && author.nickname) {
      return author.nickname;
    }
    if (isUserAuthor(author) && author.nickname) {
      return author.nickname;
    }
    return "Anonymous";
  };

  // Get author avatar - handle both API response and PostAuthor interface
  const getAuthorAvatar = () => {
    const author = post.author as ExtendedAuthor;
    if (!author) {
      return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face";
    }
    if (isUserAuthor(author) && author.avatar_url) {
      return author.avatar_url;
    }
    if (!isUserAuthor(author) && author.avatar) {
      return author.avatar;
    }
    return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face";
  };

  return {
    id: post.id, // Keep the original UUID string, don't convert to number
    title: post.title,
    content: post.content || post.excerpt || "No content available",
    author: getAuthorName(),
    authorAvatar: getAuthorAvatar(),
    publishDate:
      (post as MaybeCreatedAt).created_at ||
      post.createdAt ||
      new Date().toISOString().split("T")[0],
    readTime: "5 min read", // Default read time
    likes: post.likes || 0, // Use actual database value
    comments: post.comments || 0, // Use actual database value
    category,
    isTrending: false, // Fixed: Remove Math.random() for hydration consistency
    isPinned: false, // Fixed: Remove Math.random() for hydration consistency
    isDemo: false, // Real data is not demo
    boardPath: getBoardParam(category), // Store board parameter for URL construction
  };
};

// Post Card Component
const PostCard = ({ post, index }: { post: PostData; index: number }) => {
  // Fixed: Use deterministic date formatting to prevent hydration mismatch
  const formattedDate = new Date(post.publishDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Determine navigation href based on whether it's demo data or real data
  const getHref = () => {
    if (post.isDemo) {
      // Demo data links to board page
      return post.boardPath || "/free-board";
    } else {
      // Real data links to specific post page using /${board}/${post.id} format
      return `/${post.boardPath}/${post.id}`;
    }
  };

  return (
    <Link href={getHref()}>
      <motion.article
        className="group bg-card text-card-foreground rounded-xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer h-[280px] flex flex-col overflow-hidden relative hover:border-primary/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1, duration: 0.8, ease: "easeOut" }}
      >
        {/* Beautiful gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[length:16px_16px] opacity-30"></div>

        {/* Category indicator with better styling */}
        <div className="absolute top-4 right-4 z-10">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              post.category === "Free Board"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : post.category === "Education Board"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {post.category.replace(" Board", "")}
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col relative z-10">
          {/* Status badges */}
          <div className="flex items-center justify-start mb-4">
            <div className="flex items-center space-x-2">
              {post.isPinned && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium rounded-full">
                  📌 Pinned
                </span>
              )}
              {post.isTrending && (
                <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs font-medium rounded-full">
                  🔥 Trending
                </span>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-foreground truncate mb-3 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
            {post.title}
          </h3>

          <p className="text-muted-foreground line-clamp-3 leading-relaxed text-sm mb-4">
            {post.content}
          </p>
        </div>

        <div className="px-4 py-5 bg-gradient-to-r from-muted/30 to-muted/50 border-t border-border mt-auto relative">
          {/* Accent line */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="relative group/avatar">
                <Avatar className="w-10 h-10 ring-2 ring-background shadow-md group-hover/avatar:ring-primary/30 transition-all duration-300">
                  <AvatarImage
                    src={post.authorAvatar}
                    alt={post.author}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {post.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {post.author}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formattedDate || "Loading..."} • {post.readTime}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1 bg-background/60 px-3 py-1.5 rounded-full border border-border/50 shadow-sm hover:bg-background/80 transition-colors duration-300">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="font-medium">
                  {post.likes.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-background/60 px-3 py-1.5 rounded-full border border-border/50 shadow-sm hover:bg-background/80 transition-colors duration-300">
                <MessageSquare className="w-3 h-3 text-blue-500" />
                <span className="font-medium">{post.comments}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
};

export function CommunityBoardsSection({
  boardData,
}: CommunityBoardsSectionProps) {
  const t = useTranslations("communityBoards");

  // Mix real data with demo data to always show 3 posts per board
  const mixedBoardData = useMemo(() => {
    const mixData = (
      realData: Post[],
      category: "Free Board" | "Education Board" | "Profit Board"
    ) => {
      // If we have real data, prioritize it completely
      if (realData && realData.length > 0) {
        // Sort real data by ranking criteria (same as leaderboard-table.tsx)
        const sortedRealData = [...realData].sort((a, b) => {
          if (b.views !== a.views) return b.views - a.views;
          if (b.likes !== a.likes) return b.likes - a.likes;
          return b.comments - a.comments;
        });

        const convertedRealData = sortedRealData.map((post) =>
          convertToPostData(post, category)
        );

        // If we have 3 or more real posts, use only real data
        if (convertedRealData.length >= 3) {
          return convertedRealData.slice(0, 3);
        }

        // If we have some real posts, mix with demo data to reach 3
        if (convertedRealData.length > 0) {
          const demoData = demoPostsData.filter(
            (post) => post.category === category
          );
          const needed = 3 - convertedRealData.length;
          const selectedDemo = demoData.slice(0, needed);
          return [...convertedRealData, ...selectedDemo];
        }
      }

      // If no real data, use demo data
      const demoData = demoPostsData.filter(
        (post) => post.category === category
      );
      return demoData.slice(0, 3);
    };

    return {
      "free-board": mixData(boardData["free-board"], "Free Board"),
      "education-board": mixData(
        boardData["education-board"],
        "Education Board"
      ),
      "profit-board": mixData(boardData["profit-board"], "Profit Board"),
    };
  }, [boardData]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-20 md:px-8 md:py-40">
      <div className="max-w-[1600px] mx-auto">
        {/* Professional Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("communityBoards")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("communityDescription")}
          </p>
        </div>

        {/* Professional Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Free Board - Left Side */}
          {mixedBoardData["free-board"].map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}

          {/* Profit Board - Center */}
          {mixedBoardData["profit-board"].map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}

          {/* Education Board - Right Side */}
          {mixedBoardData["education-board"].map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

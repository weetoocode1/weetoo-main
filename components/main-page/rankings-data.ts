export interface RankingTrader {
  rank: number;
  name: string;
  value: string;
  change: string;
  color: string;
}

export interface RankingCategory {
  title: string;
  subtitle: string;
  icon: string;
  traders: RankingTrader[];
}

// Demo data for rankings section when real data is insufficient
export const DEMO_RANKINGS_DATA = {
  winRate: [
    {
      id: "demo-win-1",
      nickname: "Alex Chen",
      avatar_url: null,
      win_rate: 95.0,
      total_return: 0,
      portfolio_value: 0,
      rank: 1,
    },
    {
      id: "demo-win-2",
      nickname: "Sarah Kim",
      avatar_url: null,
      win_rate: 90.0,
      total_return: 0,
      portfolio_value: 0,
      rank: 2,
    },
    {
      id: "demo-win-3",
      nickname: "Mike Johnson",
      avatar_url: null,
      win_rate: 85.0,
      total_return: 0,
      portfolio_value: 0,
      rank: 3,
    },
    {
      id: "demo-win-4",
      nickname: "Emma Wilson",
      avatar_url: null,
      win_rate: 80.0,
      total_return: 0,
      portfolio_value: 0,
      rank: 4,
    },
    {
      id: "demo-win-5",
      nickname: "David Lee",
      avatar_url: null,
      win_rate: 75.0,
      total_return: 0,
      portfolio_value: 0,
      rank: 5,
    },
  ],
  profitRate: [
    {
      id: "demo-profit-1",
      nickname: "Alex Chen",
      avatar_url: null,
      total_return: 45.0,
      portfolio_value: 0,
      rank: 1,
    },
    {
      id: "demo-profit-2",
      nickname: "Sarah Kim",
      avatar_url: null,
      total_return: 40.0,
      portfolio_value: 0,
      rank: 2,
    },
    {
      id: "demo-profit-3",
      nickname: "Mike Johnson",
      avatar_url: null,
      total_return: 35.0,
      portfolio_value: 0,
      rank: 3,
    },
    {
      id: "demo-profit-4",
      nickname: "Emma Wilson",
      avatar_url: null,
      total_return: 30.0,
      portfolio_value: 0,
      rank: 4,
    },
    {
      id: "demo-profit-5",
      nickname: "David Lee",
      avatar_url: null,
      total_return: 25.0,
      portfolio_value: 0,
      rank: 5,
    },
  ],
  activity: [
    {
      id: "demo-activity-1",
      nickname: "Lisa Park",
      avatar_url: null,
      total_exp: 150,
      rank: 4,
    },
    {
      id: "demo-activity-2",
      nickname: "Tom Anderson",
      avatar_url: null,
      total_exp: 120,
      rank: 5,
    },
  ],
  donation: [
    {
      id: "demo-donation-1",
      nickname: "Maria Garcia",
      avatar_url: null,
      total_donation: 50,
      rank: 4,
    },
    {
      id: "demo-donation-2",
      nickname: "James Brown",
      avatar_url: null,
      total_donation: 30,
      rank: 5,
    },
  ],
  followers: [
    {
      id: "demo-followers-1",
      nickname: "Sophie Turner",
      avatar_url: null,
      total_followers: 800,
      rank: 4,
    },
    {
      id: "demo-followers-2",
      nickname: "Ryan Cooper",
      avatar_url: null,
      total_followers: 650,
      rank: 5,
    },
  ],
};

export const rankingsData: RankingCategory[] = [
  {
    title: "winRate",
    subtitle: "weeklyPerformance",
    // Target-like icon for win rate
    icon: "M12 2a10 10 0 110 20 10 10 0 010-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 110 4 2 2 0 010-4",
    traders: [
      {
        rank: 1,
        name: "Alex Chen",
        value: "+95.0%",
        change: "(+2.1%)",
        color: "text-emerald-600 dark:text-emerald-400",
      },
      {
        rank: 2,
        name: "Sarah Kim",
        value: "+90.0%",
        change: "(+1.8%)",
        color: "text-emerald-600 dark:text-emerald-400",
      },
      {
        rank: 3,
        name: "Mike Ross",
        value: "+85.0%",
        change: "(+1.5%)",
        color: "text-emerald-600 dark:text-emerald-400",
      },
      {
        rank: 4,
        name: "Emma Liu",
        value: "+80.0%",
        change: "(+1.2%)",
        color: "text-emerald-600 dark:text-emerald-400",
      },
      {
        rank: 5,
        name: "John Doe",
        value: "+75.0%",
        change: "(+0.9%)",
        color: "text-emerald-600 dark:text-emerald-400",
      },
    ],
  },
  {
    title: "profitRate",
    subtitle: "weeklyPerformance",
    // Dollar-like icon for profit rate
    icon: "M12 3v18m0 0c-3 0-5-2-5-4s2-3 5-3 5-1 5-3-2-4-5-4-5 2-5 4",
    traders: [
      {
        rank: 1,
        name: "David Park",
        value: "$900K",
        change: "(+$50K)",
        color: "text-blue-600 dark:text-blue-400",
      },
      {
        rank: 2,
        name: "Lisa Wang",
        value: "$800K",
        change: "(+$40K)",
        color: "text-blue-600 dark:text-blue-400",
      },
      {
        rank: 3,
        name: "Tom Smith",
        value: "$700K",
        change: "(+$35K)",
        color: "text-blue-600 dark:text-blue-400",
      },
      {
        rank: 4,
        name: "Anna Lee",
        value: "$600K",
        change: "(+$30K)",
        color: "text-blue-600 dark:text-blue-400",
      },
      {
        rank: 5,
        name: "Chris Wu",
        value: "$500K",
        change: "(+$25K)",
        color: "text-blue-600 dark:text-blue-400",
      },
    ],
  },
  {
    title: "activityXp",
    subtitle: "monthlyPoints",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    traders: [
      {
        rank: 1,
        name: "Ryan Kim",
        value: "9000 XP",
        change: "(+500 XP)",
        color: "text-purple-600 dark:text-purple-400",
      },
      {
        rank: 2,
        name: "Maya Patel",
        value: "8000 XP",
        change: "(+450 XP)",
        color: "text-purple-600 dark:text-purple-400",
      },
      {
        rank: 3,
        name: "Jake Wilson",
        value: "7000 XP",
        change: "(+400 XP)",
        color: "text-purple-600 dark:text-purple-400",
      },
      {
        rank: 4,
        name: "Zoe Chen",
        value: "6000 XP",
        change: "(+350 XP)",
        color: "text-purple-600 dark:text-purple-400",
      },
      {
        rank: 5,
        name: "Alex Brown",
        value: "5000 XP",
        change: "(+300 XP)",
        color: "text-purple-600 dark:text-purple-400",
      },
    ],
  },
  {
    title: "sponsored",
    subtitle: "korCoins",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    traders: [
      {
        rank: 1,
        name: "Kevin Lee",
        value: "4500 coins",
        change: "(++250)",
        color: "text-orange-600 dark:text-orange-400",
      },
      {
        rank: 2,
        name: "Sophie Zhang",
        value: "4000 coins",
        change: "(++200)",
        color: "text-orange-600 dark:text-orange-400",
      },
      {
        rank: 3,
        name: "Marcus Johnson",
        value: "3500 coins",
        change: "(++175)",
        color: "text-orange-600 dark:text-orange-400",
      },
      {
        rank: 4,
        name: "Nina Rodriguez",
        value: "3000 coins",
        change: "(++150)",
        color: "text-orange-600 dark:text-orange-400",
      },
      {
        rank: 5,
        name: "Oliver Kim",
        value: "2500 coins",
        change: "(++125)",
        color: "text-orange-600 dark:text-orange-400",
      },
    ],
  },
  {
    title: "mostFollowed",
    subtitle: "socialRanking",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    traders: [
      {
        rank: 1,
        name: "Isabella Garcia",
        value: "9K followers",
        change: "(++500)",
        color: "text-pink-600 dark:text-pink-400",
      },
      {
        rank: 2,
        name: "James Wilson",
        value: "8K followers",
        change: "(++450)",
        color: "text-pink-600 dark:text-pink-400",
      },
      {
        rank: 3,
        name: "Aria Patel",
        value: "7K followers",
        change: "(++400)",
        color: "text-pink-600 dark:text-pink-400",
      },
      {
        rank: 4,
        name: "Lucas Chen",
        value: "6K followers",
        change: "(++350)",
        color: "text-pink-600 dark:text-pink-400",
      },
      {
        rank: 5,
        name: "Mia Thompson",
        value: "5K followers",
        change: "(++300)",
        color: "text-pink-600 dark:text-pink-400",
      },
    ],
  },
];

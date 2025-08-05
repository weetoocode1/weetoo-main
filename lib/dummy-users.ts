export interface DummyUser {
  id: string;
  nickname: string;
  avatar_url: string;
  level: number;
  total_exp: number;
  rank?: number;
}

export interface DummyDonationUser {
  id: string;
  nickname: string;
  avatar_url: string;
  level: number;
  total_donation: number;
  rank?: number;
}

export interface DummyFollowersUser {
  id: string;
  nickname: string;
  avatar_url: string;
  level: number;
  total_followers: number;
  rank?: number;
}

// Daily dummy users (EXP gained in last 24 hours)
export const dailyDummyUsers: DummyUser[] = [
  {
    id: "demo-1",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_exp: 15420,
  },
  {
    id: "demo-2",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_exp: 12850,
  },
  {
    id: "demo-3",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_exp: 11230,
  },
  {
    id: "demo-4",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_exp: 9870,
  },
  {
    id: "demo-5",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_exp: 8650,
  },
  {
    id: "demo-6",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_exp: 7430,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_exp: 6920,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_exp: 6340,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_exp: 5870,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_exp: 5420,
  },
];

// Weekly dummy users (EXP gained in last 7 days)
export const weeklyDummyUsers: DummyUser[] = [
  {
    id: "demo-1",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_exp: 18750,
  },
  {
    id: "demo-2",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_exp: 16540,
  },
  {
    id: "demo-3",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_exp: 14320,
  },
  {
    id: "demo-4",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_exp: 12980,
  },
  {
    id: "demo-5",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_exp: 11560,
  },
  {
    id: "demo-6",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_exp: 10230,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_exp: 9870,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_exp: 8950,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_exp: 8230,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_exp: 7650,
  },
];

// Monthly dummy users (EXP gained in last 30 days)
export const monthlyDummyUsers: DummyUser[] = [
  {
    id: "demo-1",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_exp: 45230,
  },
  {
    id: "demo-2",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_exp: 39870,
  },
  {
    id: "demo-3",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_exp: 35640,
  },
  {
    id: "demo-4",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_exp: 32450,
  },
  {
    id: "demo-5",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_exp: 29870,
  },
  {
    id: "demo-6",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_exp: 27650,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_exp: 25430,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_exp: 23450,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_exp: 21560,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_exp: 19870,
  },
];

// Daily dummy donation users (donations received in last 24 hours)
export const dailyDummyDonationUsers: DummyDonationUser[] = [
  {
    id: "demo-1",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_donation: 15420,
  },
  {
    id: "demo-2",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_donation: 12850,
  },
  {
    id: "demo-3",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_donation: 11230,
  },
  {
    id: "demo-4",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_donation: 9870,
  },
  {
    id: "demo-5",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_donation: 8650,
  },
  {
    id: "demo-6",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_donation: 7430,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_donation: 6920,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_donation: 6340,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_donation: 5870,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_donation: 5420,
  },
];

// Weekly dummy donation users (donations received in last 7 days)
export const weeklyDummyDonationUsers: DummyDonationUser[] = [
  {
    id: "demo-1",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_donation: 18750,
  },
  {
    id: "demo-2",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_donation: 16540,
  },
  {
    id: "demo-3",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_donation: 14320,
  },
  {
    id: "demo-4",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_donation: 12980,
  },
  {
    id: "demo-5",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_donation: 11560,
  },
  {
    id: "demo-6",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_donation: 10230,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_donation: 9870,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_donation: 8950,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_donation: 8230,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_donation: 7650,
  },
];

// Monthly dummy donation users (donations received in last 30 days)
export const monthlyDummyDonationUsers: DummyDonationUser[] = [
  {
    id: "demo-1",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_donation: 45230,
  },
  {
    id: "demo-2",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_donation: 39870,
  },
  {
    id: "demo-3",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_donation: 35640,
  },
  {
    id: "demo-4",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_donation: 32450,
  },
  {
    id: "demo-5",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_donation: 29870,
  },
  {
    id: "demo-6",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_donation: 27650,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_donation: 25430,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_donation: 23450,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_donation: 21560,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_donation: 19870,
  },
];

// Daily dummy followers users (followers gained in last 24 hours)
export const dailyDummyFollowersUsers: DummyFollowersUser[] = [
  {
    id: "demo-1",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_followers: 1542,
  },
  {
    id: "demo-2",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_followers: 1285,
  },
  {
    id: "demo-3",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_followers: 1123,
  },
  {
    id: "demo-4",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_followers: 987,
  },
  {
    id: "demo-5",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_followers: 865,
  },
  {
    id: "demo-6",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_followers: 743,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_followers: 692,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_followers: 634,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_followers: 587,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_followers: 542,
  },
];

// Weekly dummy followers users (followers gained in last 7 days)
export const weeklyDummyFollowersUsers: DummyFollowersUser[] = [
  {
    id: "demo-1",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_followers: 1875,
  },
  {
    id: "demo-2",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_followers: 1654,
  },
  {
    id: "demo-3",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_followers: 1432,
  },
  {
    id: "demo-4",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_followers: 1298,
  },
  {
    id: "demo-5",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_followers: 1156,
  },
  {
    id: "demo-6",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_followers: 1023,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_followers: 987,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_followers: 895,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_followers: 823,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_followers: 765,
  },
];

// Monthly dummy followers users (followers gained in last 30 days)
export const monthlyDummyFollowersUsers: DummyFollowersUser[] = [
  {
    id: "demo-1",
    nickname: "CryptoKing",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 25,
    total_followers: 4523,
  },
  {
    id: "demo-2",
    nickname: "TradingPro",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    level: 22,
    total_followers: 3987,
  },
  {
    id: "demo-3",
    nickname: "MarketMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 20,
    total_followers: 3564,
  },
  {
    id: "demo-4",
    nickname: "BitcoinBoss",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 15,
    total_followers: 3245,
  },
  {
    id: "demo-5",
    nickname: "TradeMaster",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    level: 18,
    total_followers: 2987,
  },
  {
    id: "demo-6",
    nickname: "CryptoQueen",
    avatar_url:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    level: 16,
    total_followers: 2765,
  },
  {
    id: "demo-7",
    nickname: "EthereumElite",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    level: 14,
    total_followers: 2543,
  },
  {
    id: "demo-8",
    nickname: "AltcoinAce",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    level: 13,
    total_followers: 2345,
  },
  {
    id: "demo-9",
    nickname: "DeFiDynamo",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    level: 12,
    total_followers: 2156,
  },
  {
    id: "demo-10",
    nickname: "NFTNinja",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    level: 11,
    total_followers: 1987,
  },
];

// Helper function to get dummy users by timeframe
export function getDummyUsers(
  timeFrame: "daily" | "weekly" | "monthly"
): DummyUser[] {
  switch (timeFrame) {
    case "daily":
      return dailyDummyUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    case "weekly":
      return weeklyDummyUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    case "monthly":
      return monthlyDummyUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    default:
      return dailyDummyUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  }
}

// Helper function to get dummy donation users by timeframe
export function getDummyDonationUsers(
  timeFrame: "daily" | "weekly" | "monthly"
): DummyDonationUser[] {
  switch (timeFrame) {
    case "daily":
      return dailyDummyDonationUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    case "weekly":
      return weeklyDummyDonationUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    case "monthly":
      return monthlyDummyDonationUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    default:
      return dailyDummyDonationUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  }
}

// Helper function to get dummy followers users by timeframe
export function getDummyFollowersUsers(
  timeFrame: "daily" | "weekly" | "monthly"
): DummyFollowersUser[] {
  switch (timeFrame) {
    case "daily":
      return dailyDummyFollowersUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    case "weekly":
      return weeklyDummyFollowersUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    case "monthly":
      return monthlyDummyFollowersUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    default:
      return dailyDummyFollowersUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  }
}

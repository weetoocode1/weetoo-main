"use client";

import {
  CommunityBoardsSection,
  CTASection,
  HeroSection,
  RankingsSection,
} from "@/components/main-page";
import { Post } from "@/types/post";

interface TraderData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_return: number;
  portfolio_value: number;
  win_rate?: number;
  rank?: number;
}

interface ActivityData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_exp: number;
  rank?: number;
}

interface DonationData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_donation: number;
  rank?: number;
}

interface FollowersData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_followers: number;
  rank?: number;
}

interface RankingsData {
  returnRateData: TraderData[];
  virtualMoneyData: TraderData[];
  activityData: ActivityData[];
  donationData: DonationData[];
  followersData: FollowersData[];
}

interface BoardData {
  "free-board": Post[];
  "education-board": Post[];
  "profit-board": Post[];
}

interface HomeClientProps {
  rankingsData: RankingsData;
  boardData: BoardData;
}

export function HomeClient({ rankingsData, boardData }: HomeClientProps) {
  return (
    <div className="h-full">
      <HeroSection />

      <RankingsSection data={rankingsData} />

      <CommunityBoardsSection boardData={boardData} />

      <CTASection />
    </div>
  );
}

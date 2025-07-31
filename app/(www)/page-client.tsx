"use client";

import {
  CommunityBoardsSection,
  CTASection,
  HeroSection,
  RankingsSection,
  useBoardData,
} from "@/components/main-page";

export function HomeClient() {
  const { boardData } = useBoardData();

  return (
    <div className="h-full">
      <HeroSection />

      <RankingsSection />

      <CommunityBoardsSection boardData={boardData} />

      <CTASection />
    </div>
  );
}

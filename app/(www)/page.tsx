"use client";

import {
  CommunityBoardsSection,
  CTASection,
  HeroSection,
  RankingsSection,
  useBoardData,
} from "@/components/main-page";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export default function Home() {
  const { boardData } = useBoardData();

  // Log Supabase user/session on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[Home] Supabase session:", { data, error });
    });
    supabase.auth.getUser().then(({ data, error }) => {
      console.log("[Home] Supabase user:", { data, error });
    });
  }, []);

  return (
    <div className="h-full">
      <HeroSection />

      <RankingsSection />

      <CommunityBoardsSection boardData={boardData} />

      <CTASection />
    </div>
  );
}

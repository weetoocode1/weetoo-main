import { Metadata } from "next";
import { RankingPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Ranking | Weetoo",
  description:
    "Explore the top traders on Weetoo, showcasing their performance and success rates. Discover the best in trading.",
};

export default function Ranking() {
  return <RankingPageClient />;
}

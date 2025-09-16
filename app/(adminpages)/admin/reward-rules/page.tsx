import { Metadata } from "next";
import { RewardRulesPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Reward Rules | Weetoo",
  description: "Reward Rules Management | Weetoo",
};

export default function RewardRulesPage() {
  return <RewardRulesPageClient />;
}

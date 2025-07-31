import { Metadata } from "next";
import { InvestmentCompetitionClient } from "./page-client";

export const metadata: Metadata = {
  title: "Investment Competition | Weetoo",
  description: "Join the investment competition to win amazing prizes.",
};

export default function InvestmentCompetition() {
  return <InvestmentCompetitionClient />;
}

import { Metadata } from "next";
import { ProfitBoardPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Profit Board | Weetoo",
  description:
    "Explore the Profit Board on Weetoo, where you can share and discover insights on financial success stories. Connect with experts and enthusiasts in a vibrant community.",
};

export default function ProfitBoard() {
  return <ProfitBoardPageClient />;
}

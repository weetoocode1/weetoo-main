import { Metadata } from "next";
import { KorCoinsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Kor-Coins Rankings | Weetoo",
  description:
    "View top Kor-Coins holders and their virtual currency balances on Weetoo trading platform.",
};

export default function KorCoinsPage() {
  return <KorCoinsPageClient />;
}

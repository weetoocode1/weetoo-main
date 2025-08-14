import { KorCoinsPageClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KOR Coins | Weetoo",
  description: "KOR Coins | Weetoo",
};

export default function KorCoinsPage() {
  return <KorCoinsPageClient />;
}

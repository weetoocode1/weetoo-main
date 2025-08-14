import { ExchangeUidPageClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exchange UID | Weetoo",
  description: "Exchange UID | Weetoo",
};

export default function ExchangeUidPage() {
  return <ExchangeUidPageClient />;
}

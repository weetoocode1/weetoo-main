import { Metadata } from "next";
import { NewsClient } from "./page-client";

export const metadata: Metadata = {
  title: "News | Weetoo",
  description:
    "Stay updated with breaking crypto news, market analysis, and regulatory updates",
};

export default function News() {
  return <NewsClient />;
}

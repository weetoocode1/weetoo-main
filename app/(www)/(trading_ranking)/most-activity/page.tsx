import { Metadata } from "next";
import { MostActivityPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Most Activity | Weetoo",
  description: "Explore the most active traders on Weetoo",
};

export default function MostActivity() {
  return <MostActivityPageClient />;
}

import { MostFollowedClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Most Followed | Weetoo",
  description: "The most followed users on Weetoo",
};

export default function MostFollowedPage() {
  return <MostFollowedClient />;
}

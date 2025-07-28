import { Metadata } from "next";
import { NewsList } from "@/components/news/news-list";

export const metadata: Metadata = {
  title: "News | Weetoo",
  description:
    "Stay updated with breaking crypto news, market analysis, and regulatory updates",
};

export default function News() {
  return (
    <div className="container flex flex-col gap-10 mx-auto py-4 pb-10 px-4">
      <NewsList />
    </div>
  );
}

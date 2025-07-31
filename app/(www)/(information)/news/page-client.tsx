"use client";

import { NewsList } from "@/components/news/news-list";

export function NewsClient() {
  return (
    <div className="container flex flex-col gap-10 mx-auto py-4 pb-10 px-4">
      <NewsList />
    </div>
  );
}

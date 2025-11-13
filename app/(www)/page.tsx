import { getBoardData } from "@/lib/data/board-data";
import { getRankingsData } from "@/lib/data/rankings-data";
import { HomeClient } from "./page-client";

// Force dynamic rendering since we use cookies for authentication
export const dynamic = "force-dynamic";

export default async function Home() {
  const [rankingsData, boardData] = await Promise.all([
    getRankingsData(),
    getBoardData(),
  ]);

  return <HomeClient rankingsData={rankingsData} boardData={boardData} />;
}

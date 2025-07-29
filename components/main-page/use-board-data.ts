import { Post } from "@/types/post";
import { useEffect, useState } from "react";

export function useBoardData() {
  const [boardData, setBoardData] = useState<{
    "free-board": Post[];
    "education-board": Post[];
    "profit-board": Post[];
  }>({
    "free-board": [],
    "education-board": [],
    "profit-board": [],
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        const boards = ["free", "education", "profit"];
        const promises = boards.map(async (board) => {
          const response = await fetch(`/api/posts?board=${board}&limit=3`);
          if (response.ok) {
            const data = await response.json();
            return { board: `${board}-board`, data };
          }
          return { board: `${board}-board`, data: [] };
        });

        const results = await Promise.all(promises);
        const newBoardData = {
          "free-board": [],
          "education-board": [],
          "profit-board": [],
        };

        results.forEach(({ board, data }) => {
          newBoardData[board as keyof typeof newBoardData] = data;
        });

        setBoardData(newBoardData);
        setDataLoaded(true);
      } catch (error) {
        console.error("Failed to preload board data:", error);
        setDataLoaded(true);
      }
    };

    fetchBoardData();
  }, []);

  return { boardData, dataLoaded };
}

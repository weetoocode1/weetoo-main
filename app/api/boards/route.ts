import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch posts from all boards in parallel with author data
    const [freeBoardResult, educationBoardResult, profitBoardResult] =
      await Promise.allSettled([
        supabase
          .from("posts")
          .select(
            `*, author:users ( id, first_name, last_name, avatar_url, nickname )`
          )
          .eq("board", "free")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("posts")
          .select(
            `*, author:users ( id, first_name, last_name, avatar_url, nickname )`
          )
          .eq("board", "education")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("posts")
          .select(
            `*, author:users ( id, first_name, last_name, avatar_url, nickname )`
          )
          .eq("board", "profit")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const data = {
      "free-board":
        freeBoardResult.status === "fulfilled"
          ? freeBoardResult.value.data || []
          : [],
      "education-board":
        educationBoardResult.status === "fulfilled"
          ? educationBoardResult.value.data || []
          : [],
      "profit-board":
        profitBoardResult.status === "fulfilled"
          ? profitBoardResult.value.data || []
          : [],
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching board data:", error);
    return NextResponse.json(
      {
        "free-board": [],
        "education-board": [],
        "profit-board": [],
      },
      { status: 500 }
    );
  }
}

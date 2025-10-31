import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: stream, error: fetchError } = await supabase
      .from("user_streams")
      .select("custom_thumbnail_url")
      .eq("stream_id", streamId)
      .single();

    if (fetchError || !stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.custom_thumbnail_url) {
      const filePath = stream.custom_thumbnail_url.split(
        "/stream-thumbnails/"
      )[1];

      if (filePath) {
        await supabase.storage.from("stream-thumbnails").remove([filePath]);
      }
    }

    const { error: updateError } = await supabase
      .from("user_streams")
      .update({
        custom_thumbnail_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stream_id", streamId);

    if (updateError) {
      console.error("Error updating stream:", updateError);
      return NextResponse.json(
        { error: "Failed to remove thumbnail" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to remove thumbnail" },
      { status: 500 }
    );
  }
}

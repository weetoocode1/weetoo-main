import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const streamId = formData.get("streamId") as string;

    if (!file || !streamId) {
      return NextResponse.json(
        { error: "File and stream ID are required" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: stream, error: streamError } = await supabase
      .from("user_streams")
      .select("*")
      .eq("stream_id", streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${streamId}/${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `stream-thumbnails/${fileName}`;

    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("stream-thumbnails")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading thumbnail:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload thumbnail" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("stream-thumbnails").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("user_streams")
      .update({
        custom_thumbnail_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("stream_id", streamId);

    if (updateError) {
      console.error("Error updating stream:", updateError);
      return NextResponse.json(
        { error: "Failed to update stream" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to upload thumbnail" },
      { status: 500 }
    );
  }
}

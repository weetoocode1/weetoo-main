import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Server-side ban guard: block banned users from mutating profile
    const { data: banRow } = await supabase
      .from("users")
      .select("banned, ban_reason, banned_at")
      .eq("id", user!.id)
      .single();
    if (banRow?.banned) {
      return NextResponse.json(
        {
          error: "Account banned",
          reason: banRow.ban_reason || null,
          banned_at: banRow.banned_at || null,
        },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { first_name, last_name, nickname } = body;

    // Validate required fields
    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      nickname: nickname?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Update user in the users table
    const { data, error } = await supabase
      .from("users")
      .update(sanitizedData)
      .eq("id", user.id)
      .select(
        "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins, role, mobile_number, identity_verified"
      )
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // Also update auth.users metadata to keep everything in sync
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: sanitizedData.first_name,
          last_name: sanitizedData.last_name,
        },
      });

      if (authError) {
        console.warn(
          "Auth metadata update failed, but user data was saved:",
          authError
        );
        // Don't throw error here - user data was saved successfully
      }
    } catch (authError) {
      console.warn(
        "Auth metadata update failed, but user data was saved:",
        authError
      );
      // Continue with success - user data was saved
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: data,
    });
  } catch (error) {
    console.error("Error in profile update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

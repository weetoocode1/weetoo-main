import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user session to exclude them from the list
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    // Fetch all users with their roles, excluding the current user
    const { data: users, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role")
      .neq("id", currentUserId || "") // Exclude current user
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Format user data
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim() || "Unknown User",
      email: user.email,
      role: user.role,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

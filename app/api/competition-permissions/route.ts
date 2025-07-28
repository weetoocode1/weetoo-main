import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Type definitions for the API
interface CompetitionPermission {
  user_id: string;
  granted_at: string;
  users:
    | {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
      }[]
    | null;
}

interface FormattedPermission {
  userId: string;
  name: string;
  email: string;
  grantedAt: string;
}

interface PermissionRequest {
  userId: string;
  action: "grant" | "revoke";
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch users with active permissions - specify the correct relationship
    const { data: permissions, error } = await supabase
      .from("competition_permissions")
      .select(
        `
        user_id,
        granted_at,
        users!competition_permissions_user_id_fkey(id, first_name, last_name, email)
      `
      )
      .eq("is_active", true)
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("Error fetching permissions:", error);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    // Format the response
    const formattedPermissions: FormattedPermission[] = permissions.map(
      (permission: CompetitionPermission) => {
        // Handle case where users data might be null or empty
        const user =
          permission.users && permission.users.length > 0
            ? permission.users[0]
            : null;

        return {
          userId: permission.user_id,
          name: user
            ? `${user.first_name} ${user.last_name}`.trim() || "Unknown User"
            : "Unknown User",
          email: user?.email || "No email available",
          grantedAt: permission.granted_at,
        };
      }
    );

    return NextResponse.json({ permissions: formattedPermissions });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { userId, action }: PermissionRequest = await request.json();

    if (action === "grant") {
      // Grant permission
      const { error } = await supabase.from("competition_permissions").upsert(
        {
          user_id: userId,
          granted_by: null, // We'll set this to null since we removed current user check
          is_active: true,
          revoked_at: null,
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        console.error("Error granting permission:", error);
        return NextResponse.json(
          { error: "Failed to grant permission" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Permission granted successfully",
      });
    } else if (action === "revoke") {
      // Revoke permission
      const { error } = await supabase
        .from("competition_permissions")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Error revoking permission:", error);
        return NextResponse.json(
          { error: "Failed to revoke permission" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Permission revoked successfully",
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

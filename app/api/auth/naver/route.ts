import { NextRequest, NextResponse } from "next/server";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Helper to fetch JSON
async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code) {
    return NextResponse.redirect("/login?error=missing_code");
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetchJson(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
    );
    const accessToken = tokenRes.access_token;
    if (!accessToken) throw new Error("No access token from Naver");

    // 2. Fetch user profile from Naver
    let profileData;
    try {
      const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      profileData = await profileRes.json();
    } catch (_profileErr) {
      throw new Error("Failed to fetch Naver profile");
    }
    if (profileData.resultcode !== "00")
      throw new Error("Failed to fetch Naver profile");
    const naverUser = profileData.response;
    const email = naverUser.email;
    const naverId = naverUser.id;
    const nickname = naverUser.nickname || "naver_user";
    if (!email || !naverId) throw new Error("Missing email or id from Naver");

    // 3. Create or sign in user in Supabase Auth using Admin API
    //    Use email as unique identifier, store naverId in user_metadata
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: {
          naver_id: naverId,
          nickname,
          provider: "naver",
        },
      }),
    });
    const adminUser = await adminRes.json();
    if (!adminRes.ok && adminUser.msg && !adminUser.id) {
      // If user already exists, fetch user by email
      const getUserRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(
          email
        )}`,
        {
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        }
      );
      const getUserData = await getUserRes.json();
      if (!getUserRes.ok || !getUserData.users || !getUserData.users[0]) {
        throw new Error("Failed to fetch existing user");
      }
    }
    // 4. Redirect to callback page (or set session cookie if possible)
    //    You may want to implement a custom session handoff here
    return NextResponse.redirect("/callback?provider=naver");
  } catch (err: unknown) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return NextResponse.redirect(`/login?error=${encodeURIComponent(message)}`);
  }
}

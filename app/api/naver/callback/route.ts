import { NextRequest, NextResponse } from "next/server";

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

export async function POST(req: NextRequest) {
  try {
    const { code, state } = await req.json();
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Failed to get Naver access token" },
        { status: 400 }
      );
    }

    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    if (profileData.resultcode !== "00") {
      return NextResponse.json(
        { error: "Failed to get Naver profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: profileData.response.email,
      naver_id: profileData.response.id,
      name: profileData.response.name,
      profile_image: profileData.response.profile_image,
    });
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

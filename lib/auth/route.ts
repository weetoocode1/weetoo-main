// Constants for Naver OAuth
export const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID!;
export const NAVER_REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback/naver`;
export const NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize";
export const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
export const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";

// Function to generate the Naver OAuth URL
export function getNaverOAuthURL() {
  // Generate a random state
  const state =
    typeof window !== "undefined" && window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : Math.random().toString(36).substring(2);

  // Store the state in localStorage for verification
  if (typeof window !== "undefined") {
    localStorage.setItem("naver_oauth_state", state);
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: NAVER_CLIENT_ID,
    redirect_uri: NAVER_REDIRECT_URI,
    state: state,
  });

  const url = `${NAVER_AUTH_URL}?${params.toString()}`;
  // Debug log removed for production cleanliness
  return url;
}

// Types for Naver responses
export interface NaverTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface NaverUserResponse {
  resultcode: string;
  message: string;
  response: {
    id: string;
    nickname: string;
    name: string;
    email: string;
    gender: string;
    age: string;
    birthday: string;
    profile_image: string;
  };
}

"use client";

import { useAuth } from "@/hooks/use-auth";

// Mount this once at the app root to ensure auth + realtime ban listeners are active globally.
export const AuthRealtimeGuard = () => {
  // This call sets up session fetch and realtime subscriptions (users, user_bans)
  useAuth();
  return null;
};

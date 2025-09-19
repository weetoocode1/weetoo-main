"use client";

import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface MarketPurchase {
  id: string;
  user_id: string;
  product_key: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchased_at: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseItem {
  product_key: string;
  product_name: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const MARKET_PURCHASES_KEY = ["market-purchases"];

// Fetch user's purchase history
async function fetchUserPurchases(userId: string): Promise<MarketPurchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("market_purchases")
    .select("*")
    .eq("user_id", userId)
    .order("purchased_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch market purchases:", error);
    throw error;
  }

  return data || [];
}

// Purchase items from the market
async function purchaseItems(
  userId: string,
  items: PurchaseItem[]
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  // First, get current user data to check KOR coins balance
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("kor_coins")
    .eq("id", userId)
    .single();

  if (userError) {
    throw new Error("Failed to fetch user data");
  }

  const currentBalance = userData.kor_coins || 0;
  const totalCost = items.reduce((sum, item) => sum + item.total_price, 0);

  if (currentBalance < totalCost) {
    throw new Error(
      `Insufficient KOR coins. You have ${currentBalance.toLocaleString()} but need ${totalCost.toLocaleString()}`
    );
  }

  // Start a transaction
  const { data: purchases, error: purchaseError } = await supabase
    .from("market_purchases")
    .insert(
      items.map((item) => ({
        user_id: userId,
        product_key: item.product_key,
        product_name: item.product_name,
        product_description: item.product_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
    )
    .select();

  if (purchaseError) {
    throw new Error("Failed to record purchases");
  }

  // Update user's KOR coins balance
  const newBalance = currentBalance - totalCost;
  const { error: updateError } = await supabase
    .from("users")
    .update({ kor_coins: newBalance })
    .eq("id", userId);

  if (updateError) {
    throw new Error("Failed to update KOR coins balance");
  }

  return {
    success: true,
    message: `Successfully purchased ${
      items.length
    } item(s) for ${totalCost.toLocaleString()} KOR coins`,
  };
}

export function useMarketPurchases(userId?: string) {
  const queryClient = useQueryClient();

  // Fetch user's purchase history
  const {
    data: purchases,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...MARKET_PURCHASES_KEY, userId],
    queryFn: () => fetchUserPurchases(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (items: PurchaseItem[]) => purchaseItems(userId!, items),
    onSuccess: (result) => {
      // Invalidate and refetch user data to update KOR coins
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });

      // Invalidate purchases to show new purchase
      queryClient.invalidateQueries({
        queryKey: [...MARKET_PURCHASES_KEY, userId],
      });

      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    purchases: purchases || [],
    isLoading,
    error,
    purchaseItems: purchaseMutation.mutate,
    isPurchasing: purchaseMutation.isPending,
  };
}

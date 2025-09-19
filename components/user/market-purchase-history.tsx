"use client";

import { useMarketPurchases } from "@/hooks/use-market-purchases";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

export function MarketPurchaseHistory() {
  const t = useTranslations("weetooMarket");
  const { user } = useAuth();
  const { purchases, isLoading } = useMarketPurchases(user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading purchases...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No purchases yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your market purchases will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{purchase.product_name}</h4>
                  {purchase.quantity > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      x{purchase.quantity}
                    </Badge>
                  )}
                </div>
                {purchase.product_description && (
                  <p className="text-sm text-muted-foreground">
                    {purchase.product_description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(
                    new Date(purchase.purchased_at),
                    "MMM dd, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-yellow-500">
                  {purchase.total_price.toLocaleString()} {t("korCoins")}
                </p>
                {purchase.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {purchase.unit_price.toLocaleString()} each
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

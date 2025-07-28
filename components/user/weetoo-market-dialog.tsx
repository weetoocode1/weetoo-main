import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Icons } from "../icons";

type ProductKey = "memberReset" | "chatReset" | "messageRights";

type Product = {
  key: ProductKey;
  name: string;
  description: string;
  price: number;
};

const PRODUCTS: Product[] = [
  {
    key: "memberReset",
    name: "Member history reset (integrated)",
    description: "Reset all your member activity history in one go.",
    price: 10000,
  },
  {
    key: "chatReset",
    name: "Reset chat room history",
    description: "Clear your chat room conversations instantly.",
    price: 300,
  },
  {
    key: "messageRights",
    name: "Message Usage Rights",
    description: "Unlock additional message sending privileges.",
    price: 300,
  },
];

type Quantities = Record<ProductKey, number>;

export function WeetooMarketDialog() {
  const [quantities, setQuantities] = useState<Quantities>({
    memberReset: 0,
    chatReset: 0,
    messageRights: 0,
  });
  const minQty = 0;
  const maxQty = 99;

  const total = PRODUCTS.reduce(
    (sum, p) => sum + quantities[p.key] * p.price,
    0
  );

  const handleQtyChange = (key: ProductKey, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(minQty, Math.min(maxQty, prev[key] + delta)),
    }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-2">
                  <Icons.market className="w-5 h-5 text-muted-foreground" />
                  <span className="sr-only">Weetoo Market</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Weetoo Market</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Icons.market className="w-6 h-6 text-yellow-400" />
            Weetoo Market
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1 font-normal">
            Shop digital services and features for your account.
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 pb-2">
          {PRODUCTS.map((product) => (
            <div
              key={product.key}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-background/80 shadow-sm hover:shadow-lg transition-shadow group w-full min-w-0 overflow-x-hidden"
            >
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="font-semibold text-base truncate group-hover:text-yellow-500 transition-colors">
                  {product.name}
                </div>
                <div className="text-xs text-muted-foreground group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors">
                  {product.description}
                </div>
                <div className="text-sm font-bold text-yellow-500 mt-1">
                  {product.price.toLocaleString()} cash
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 shrink-0 self-start sm:self-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => handleQtyChange(product.key, -1)}
                  disabled={quantities[product.key] <= minQty}
                  aria-label={`Decrease quantity for ${product.name}`}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-semibold text-base select-none">
                  {quantities[product.key]}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => handleQtyChange(product.key, 1)}
                  disabled={quantities[product.key] >= maxQty}
                  aria-label={`Increase quantity for ${product.name}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Total and Purchase Button */}
        <div className="px-6 pt-4 pb-6 border-t bg-background/95 rounded-b-2xl shadow-inner">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold text-muted-foreground">
              Total
            </span>
            <span className="text-2xl font-bold tabular-nums text-yellow-500">
              {total.toLocaleString()} cash
            </span>
          </div>
          <Button
            className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-xl text-lg transition-colors shadow-md disabled:opacity-60"
            disabled={total === 0}
          >
            Purchase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

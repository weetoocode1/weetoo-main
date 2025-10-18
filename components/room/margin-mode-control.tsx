"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type MarginMode = "cross" | "isolated";

interface MarginModeControlProps {
  marginMode: MarginMode;
  setMarginMode: (mode: MarginMode) => void;
  isHost: boolean;
}

export const MarginModeControl = ({
  marginMode,
  setMarginMode,
  isHost,
}: MarginModeControlProps) => {
  const t = useTranslations("room.tradingForm");
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [pendingMarginMode, setPendingMarginMode] =
    useState<MarginMode>(marginMode);

  return (
    <div className="relative w-1/2 pr-1">
      <Dialog open={showMarginModal} onOpenChange={setShowMarginModal}>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            onClick={() => {
              if (!isHost) return;
              setPendingMarginMode(marginMode);
              setShowMarginModal(true);
            }}
            className="flex items-center justify-between gap-1 py-1.5 px-3 w-full text-xs font-medium"
            disabled={!isHost}
          >
            {marginMode === "cross" ? t("margin.cross") : t("margin.isolated")}{" "}
            <span className="text-muted-foreground">
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="!sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("margin.chooseTitle")}</DialogTitle>
            <DialogDescription>{t("margin.chooseDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup
              value={pendingMarginMode}
              onValueChange={(value: MarginMode) => setPendingMarginMode(value)}
              className="flex flex-row space-x-4"
            >
              <div
                className={`flex-1 flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                  pendingMarginMode === "cross"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
                onClick={() => setPendingMarginMode("cross")}
              >
                <RadioGroupItem value="cross" id="cross" className="sr-only" />
                <Label htmlFor="cross" className="cursor-pointer">
                  {t("margin.cross")}
                </Label>
              </div>
              <div
                className={`flex-1 flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                  pendingMarginMode === "isolated"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
                onClick={() => setPendingMarginMode("isolated")}
              >
                <RadioGroupItem
                  value="isolated"
                  id="isolated"
                  className="sr-only"
                />
                <Label htmlFor="isolated" className="cursor-pointer">
                  {t("margin.isolated")}
                </Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            {t("margin.notice1")}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            {t("margin.notice2")}
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowMarginModal(false)}
              disabled={!isHost}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                setMarginMode(pendingMarginMode);
                setShowMarginModal(false);
              }}
              disabled={!isHost}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarginModeControl;

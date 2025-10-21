import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AdvancedLong, AdvancedShort, BasicTpSl } from "./tp-sl";
import { ApplicableToToggle } from "./tp-sl/applicable-to-toggle";
import { TpSlHeader } from "./tp-sl/tp-sl-header";

interface TpSlSectionProps {
  tpSlChecked: boolean;
  setTpSlChecked: (checked: boolean) => void;
  tpSlMode: "basic" | "advanced";
  setTpSlMode: (mode: "basic" | "advanced") => void;
  orderType: "market" | "limit";
  onTpSlChange?: (data: {
    tpEnabled: boolean;
    slEnabled: boolean;
    takeProfitValue: number;
    stopLossValue: number;
  }) => void;
}

export function TpSlSection({
  tpSlChecked,
  setTpSlChecked,
  tpSlMode,
  setTpSlMode,
  orderType,
  onTpSlChange,
}: TpSlSectionProps) {
  const [takeProfitValue, setTakeProfitValue] = useState<number | "">("");
  const [stopLossValue, setStopLossValue] = useState<number | "">("");

  // TP/SL toggles with proper defaults
  const [tpEnabled, setTpEnabled] = useState(false); // Default OFF
  const [slEnabled, setSlEnabled] = useState(true); // Default ON

  // Ensure TP/SL is enabled by default on mount
  useEffect(() => {
    if (!tpSlChecked) {
      setTpSlChecked(true);
    }
    // We intentionally only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent component when TP/SL values change
  useEffect(() => {
    if (onTpSlChange) {
      onTpSlChange({
        tpEnabled,
        slEnabled,
        takeProfitValue:
          typeof takeProfitValue === "number" ? takeProfitValue : 0,
        stopLossValue: typeof stopLossValue === "number" ? stopLossValue : 0,
      });
    }
  }, [tpEnabled, slEnabled, takeProfitValue, stopLossValue, onTpSlChange]);

  const [activePositionType, setActivePositionType] = useState<
    "long" | "short"
  >("long");
  const [applicableTo, setApplicableTo] = useState<"entire" | "current">(
    "entire"
  );
  const [triggerPrice, setTriggerPrice] = useState<number | "">("");
  const [triggerPriceType, setTriggerPriceType] = useState("last");
  const [roiValue, setRoiValue] = useState<number | "">("");
  const [limitChecked, setLimitChecked] = useState(false);
  const [stopLossLimitChecked, setStopLossLimitChecked] = useState(false);
  const [showTakeProfitTooltip, setShowTakeProfitTooltip] = useState(false);
  const [showStopLossTooltip, setShowStopLossTooltip] = useState(false);
  const [takeProfitTriggerMethod, setTakeProfitTriggerMethod] = useState("roi");
  const [stopLossTriggerMethod, setStopLossTriggerMethod] = useState("roi");

  // Short tab states (completely separate from Long tab)
  const [shortTriggerPrice, setShortTriggerPrice] = useState<number | "">("");
  const [shortTriggerPriceType, setShortTriggerPriceType] = useState("last");
  const [shortRoiValue, setShortRoiValue] = useState<number | "">("");
  const [shortStopLossValue, setShortStopLossValue] = useState<number | "">("");

  const [showShortTakeProfitTooltip, setShowShortTakeProfitTooltip] =
    useState(false);
  const [showShortStopLossTooltip, setShowShortStopLossTooltip] =
    useState(false);
  const [shortTakeProfitTriggerMethod, setShortTakeProfitTriggerMethod] =
    useState("roi");
  const [shortStopLossTriggerMethod, setShortStopLossTriggerMethod] =
    useState("roi");

  return (
    <div className="border py-2.5 px-2 bg-muted/20 rounded-md">
      <TpSlHeader
        checked={tpSlChecked}
        onCheckedChange={setTpSlChecked}
        mode={tpSlMode}
        // onToggleMode={() =>
        //   setTpSlMode(tpSlMode === "basic" ? "advanced" : "basic")
        // }
      />

      <div>
        {tpSlChecked && (
          <div className="overflow-hidden">
            {tpSlMode === "basic" ? (
              <BasicTpSl
                takeProfitValue={takeProfitValue}
                setTakeProfitValue={setTakeProfitValue}
                stopLossValue={stopLossValue}
                setStopLossValue={setStopLossValue}
                tpEnabled={tpEnabled}
                setTpEnabled={setTpEnabled}
                slEnabled={slEnabled}
                setSlEnabled={setSlEnabled}
                orderType={orderType}
              />
            ) : (
              <div className="pt-3">
                <Dialog>
                  <DialogTrigger asChild className="gap-1">
                    <Button className="w-full h-10 text-sm" variant="outline">
                      <PlusCircleIcon className="h-4 w-4" />
                      TP/SL
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] !max-w-lg overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add TP/SL</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                      {/* Position Information */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground">Price</div>
                            <div className="font-medium">$50,000</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              Quantity
                            </div>
                            <div className="font-medium">0.1 BTC</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              Last Traded Price
                            </div>
                            <div className="font-medium">$49,500</div>
                          </div>
                        </div>
                      </div>

                      {/* Position Type Tabs */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setActivePositionType("long")}
                            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer rounded-md ${
                              activePositionType === "long"
                                ? "bg-profit/20 text-profit"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Long
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePositionType("short")}
                            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer rounded-md ${
                              activePositionType === "short"
                                ? "bg-loss/20 text-loss"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Short
                          </button>
                        </div>
                      </div>

                      {/* Applicable to Section - Only show for Long tab */}
                      {activePositionType === "long" && (
                        <ApplicableToToggle
                          value={applicableTo}
                          onToggle={() =>
                            setApplicableTo(
                              applicableTo === "entire" ? "current" : "entire"
                            )
                          }
                        />
                      )}

                      {/* Take Profit Section - Only show for Long tab */}
                      {activePositionType === "long" && (
                        <AdvancedLong
                          applicableTo={applicableTo}
                          setApplicableTo={setApplicableTo}
                          limitChecked={limitChecked}
                          setLimitChecked={setLimitChecked}
                          stopLossLimitChecked={stopLossLimitChecked}
                          setStopLossLimitChecked={setStopLossLimitChecked}
                          triggerPrice={triggerPrice as number}
                          setTriggerPrice={setTriggerPrice}
                          triggerPriceType={triggerPriceType}
                          setTriggerPriceType={setTriggerPriceType}
                          roiValue={roiValue as number}
                          setRoiValue={setRoiValue}
                          showTakeProfitTooltip={showTakeProfitTooltip}
                          setShowTakeProfitTooltip={setShowTakeProfitTooltip}
                          takeProfitTriggerMethod={
                            takeProfitTriggerMethod as "roi" | "change" | "pnl"
                          }
                          setTakeProfitTriggerMethod={
                            setTakeProfitTriggerMethod
                          }
                          stopLossValue={stopLossValue as number}
                          setStopLossValue={
                            setStopLossValue as (v: number) => void
                          }
                          showStopLossTooltip={showStopLossTooltip}
                          setShowStopLossTooltip={setShowStopLossTooltip}
                          stopLossTriggerMethod={
                            stopLossTriggerMethod as "roi" | "change" | "pnl"
                          }
                          setStopLossTriggerMethod={setStopLossTriggerMethod}
                        />
                      )}

                      {/* Short Tab Content */}
                      {activePositionType === "short" && (
                        <>
                          <ApplicableToToggle
                            value={applicableTo}
                            onToggle={() =>
                              setApplicableTo(
                                applicableTo === "entire" ? "current" : "entire"
                              )
                            }
                          />
                          <div className="space-y-1.5">
                            {/* Take Profit Section - Only show for Short tab */}
                            <AdvancedShort
                              shortTriggerPrice={shortTriggerPrice as number}
                              setShortTriggerPrice={setShortTriggerPrice}
                              shortTriggerPriceType={shortTriggerPriceType}
                              setShortTriggerPriceType={
                                setShortTriggerPriceType
                              }
                              shortRoiValue={shortRoiValue as number}
                              setShortRoiValue={setShortRoiValue}
                              showShortTakeProfitTooltip={
                                showShortTakeProfitTooltip
                              }
                              setShowShortTakeProfitTooltip={
                                setShowShortTakeProfitTooltip
                              }
                              shortTakeProfitTriggerMethod={
                                shortTakeProfitTriggerMethod as
                                  | "roi"
                                  | "change"
                                  | "pnl"
                              }
                              setShortTakeProfitTriggerMethod={
                                setShortTakeProfitTriggerMethod
                              }
                              shortStopLossValue={shortStopLossValue as number}
                              setShortStopLossValue={setShortStopLossValue}
                              showShortStopLossTooltip={
                                showShortStopLossTooltip
                              }
                              setShowShortStopLossTooltip={
                                setShowShortStopLossTooltip
                              }
                              shortStopLossTriggerMethod={
                                shortStopLossTriggerMethod as
                                  | "roi"
                                  | "change"
                                  | "pnl"
                              }
                              setShortStopLossTriggerMethod={
                                setShortStopLossTriggerMethod
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <DialogFooter className="mt-6">
                      <div className="grid w-full grid-cols-2 gap-2">
                        <Button className="w-full h-10">Confirm</Button>
                        <DialogTrigger asChild>
                          <Button className="w-full h-10" variant="outline">
                            Cancel
                          </Button>
                        </DialogTrigger>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

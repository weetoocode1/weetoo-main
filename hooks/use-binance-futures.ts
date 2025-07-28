import { useEffect, useState } from "react";

export function useBinanceFutures(symbol: string) {
  const [openInterest, setOpenInterest] = useState<string | null>(null);
  const [fundingRate, setFundingRate] = useState<string | null>(null);
  const [nextFundingTime, setNextFundingTime] = useState<number | null>(null);

  useEffect(() => {
    if (!symbol) return;

    fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`)
      .then((res) => res.json())
      .then((data) => setOpenInterest(data.openInterest))
      .catch(() => setOpenInterest(null));

    fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        setFundingRate(data.lastFundingRate);
        setNextFundingTime(data.nextFundingTime);
      })
      .catch(() => {
        setFundingRate(null);
        setNextFundingTime(null);
      });
  }, [symbol]);

  return { openInterest, fundingRate, nextFundingTime };
}

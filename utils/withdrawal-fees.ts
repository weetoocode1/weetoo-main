export interface WithdrawalFeeCalculation {
  feePercentage: number;
  feeAmount: number;
  finalAmount: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
}

export function calculateWithdrawalFee(
  level: number,
  amount: number
): WithdrawalFeeCalculation {
  let feePercentage = 40; // Default for level 1-25 (Bronze)
  let tier: "Bronze" | "Silver" | "Gold" | "Platinum" = "Bronze";

  if (level >= 76 && level <= 99) {
    feePercentage = 10; // Platinum
    tier = "Platinum";
  } else if (level >= 51 && level <= 75) {
    feePercentage = 20; // Gold
    tier = "Gold";
  } else if (level >= 26 && level <= 50) {
    feePercentage = 30; // Silver
    tier = "Silver";
  }
  // Level 1-25 stays at 40% (Bronze)

  const feeAmount = Math.floor((amount * feePercentage) / 100);
  const finalAmount = amount - feeAmount;

  return {
    feePercentage,
    feeAmount,
    finalAmount,
    tier,
  };
}

export function getLevelTier(
  level: number
): "Bronze" | "Silver" | "Gold" | "Platinum" {
  if (level >= 76 && level <= 99) return "Platinum";
  if (level >= 51 && level <= 75) return "Gold";
  if (level >= 26 && level <= 50) return "Silver";
  return "Bronze";
}

export function getTierColor(tier: "Bronze" | "Silver" | "Gold" | "Platinum") {
  switch (tier) {
    case "Bronze":
      return "text-amber-600 bg-amber-100 border-amber-300";
    case "Silver":
      return "text-gray-600 bg-gray-100 border-gray-300";
    case "Gold":
      return "text-yellow-600 bg-yellow-100 border-yellow-300";
    case "Platinum":
      return "text-purple-600 bg-purple-100 border-purple-300";
    default:
      return "text-gray-600 bg-gray-100 border-gray-300";
  }
}

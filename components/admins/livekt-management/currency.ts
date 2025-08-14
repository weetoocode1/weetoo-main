export const formatCurrency = (
  amount: number | undefined,
  isKRW = false
): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return isKRW ? "₩0" : "$0.00";
  }

  if (isKRW) {
    return `₩${(amount * 1300).toLocaleString()}`;
  }
  return `$${amount.toFixed(2)}`;
};

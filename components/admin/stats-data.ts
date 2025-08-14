export interface StatData {
  title: string;
  value: string | number;
  trend: {
    value: number;
    isPositive: boolean;
  };
  description: string;
  subDescription: string;
  color:
    | "blue"
    | "green"
    | "purple"
    | "orange"
    | "violet"
    | "rose"
    | "fuchsia"
    | "cyan"
    | "red"
    | "yellow";
  isRealData?: boolean; // Flag to indicate if this stat uses real data
}

// Mock data - replace with real API calls
export const stats: StatData[] = [
  {
    title: "Total Users",
    value: 0,
    trend: { value: 0, isPositive: true },
    description: "Platform size",
    subDescription: "All registered users",
    color: "blue",
    isRealData: true,
  },
  {
    title: "New Users",
    value: 0,
    trend: { value: 0, isPositive: true },
    description: "Today's signups",
    subDescription: "Daily new registrations",
    color: "green",
    isRealData: true,
  },
  {
    title: "New Signups",
    value: 0,
    trend: { value: 0, isPositive: true },
    description: "Weekly growth",
    subDescription: "This week's new users",
    color: "purple",
    isRealData: true,
  },
  {
    title: "Total KOR Coins",
    value: 0,
    trend: { value: 0, isPositive: true },
    description: "Economic activity",
    subDescription: "Platform-wide coins",
    color: "orange",
    isRealData: true,
  },
  {
    title: "Posts Today",
    value: 0, // Will be replaced with real data
    trend: { value: 0, isPositive: true }, // Calculated by API
    description: "Content activity",
    subDescription: "Daily content creation",
    color: "violet",
    isRealData: true, // This will use real data
  },
  {
    title: "Active Rooms",
    value: 0, // Will be replaced with real data
    trend: { value: 0, isPositive: true }, // Calculated by API
    description: "Core feature usage",
    subDescription: "Live trading rooms",
    color: "red",
    isRealData: true, // This will use real data
  },
  {
    title: "Deposits Pending",
    value: "47",
    trend: { value: 0, isPositive: false }, // Will be calculated when we implement real data
    description: "Revenue pipeline",
    subDescription: "Awaiting approval",
    color: "fuchsia",
  },
  {
    title: "Pending Reports",
    value: "8",
    trend: { value: 0, isPositive: true }, // Will be calculated when we implement real data
    description: "Admin workload",
    subDescription: "Issues to review",
    color: "cyan",
  },
];

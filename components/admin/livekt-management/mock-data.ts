import type { Metrics, ChartDataPoint, User, Room } from "@/types";

export const metrics: Metrics = {
  broadcastingTime: { value: "2,847", unit: "min", change: 8.5, cost: 42.7 },
  listeningTime: { value: "18,392", unit: "min", change: 12.3, cost: 183.92 },
  totalCost: {
    value: 226.62,
    change: 10.2,
    cost: 226.62,
    users: 1247,
    rooms: 89,
  },
};

export const usagePatternData: ChartDataPoint[] = [
  { hour: "00:00", broadcasting: 45, listening: 120 },
  { hour: "02:00", broadcasting: 32, listening: 89 },
  { hour: "04:00", broadcasting: 28, listening: 67 },
  { hour: "06:00", broadcasting: 56, listening: 145 },
  { hour: "08:00", broadcasting: 89, listening: 234 },
  { hour: "10:00", broadcasting: 134, listening: 345 },
  { hour: "12:00", broadcasting: 167, listening: 456 },
  { hour: "14:00", broadcasting: 189, listening: 523 },
  { hour: "16:00", broadcasting: 156, listening: 467 },
  { hour: "18:00", broadcasting: 123, listening: 389 },
  { hour: "20:00", broadcasting: 98, listening: 267 },
  { hour: "22:00", broadcasting: 67, listening: 178 },
];

export const dayOfWeekData: ChartDataPoint[] = [
  { day: "Sunday", broadcasting: 456, listening: 1234 },
  { day: "Monday", broadcasting: 789, listening: 2345 },
  { day: "Tuesday", broadcasting: 567, listening: 1876 },
  { day: "Wednesday", broadcasting: 834, listening: 2567 },
  { day: "Thursday", broadcasting: 923, listening: 2789 },
  { day: "Friday", broadcasting: 678, listening: 2134 },
  { day: "Saturday", broadcasting: 345, listening: 987 },
];

export const topUsers: User[] = [
  {
    user: "alice@company.com",
    broadcasting: 245,
    listening: 1230,
    cost: 14.75,
    status: "Active",
    avatar: "A",
  },
  {
    user: "bob.smith@company.com",
    broadcasting: 189,
    listening: 890,
    cost: 10.79,
    status: "Active",
    avatar: "B",
  },
  {
    user: "charlie.brown@company.com",
    broadcasting: 156,
    listening: 670,
    cost: 8.26,
    status: "Inactive",
    avatar: "C",
  },
  {
    user: "diana.prince@company.com",
    broadcasting: 134,
    listening: 540,
    cost: 6.74,
    status: "Active",
    avatar: "D",
  },
  {
    user: "edward.norton@company.com",
    broadcasting: 98,
    listening: 320,
    cost: 4.18,
    status: "Inactive",
    avatar: "E",
  },
];

export const topRooms: Room[] = [
  {
    room: "Weekly All-Hands Meeting",
    broadcasting: 890,
    listening: 4560,
    cost: 54.5,
    status: "Active",
    participants: 45,
  },
  {
    room: "Product Demo Session",
    broadcasting: 456,
    listening: 2340,
    cost: 27.96,
    status: "Active",
    participants: 23,
  },
  {
    room: "Engineering Standup",
    broadcasting: 234,
    listening: 1200,
    cost: 14.34,
    status: "Scheduled",
    participants: 12,
  },
  {
    room: "Client Presentation",
    broadcasting: 189,
    listening: 945,
    cost: 11.34,
    status: "Active",
    participants: 8,
  },
  {
    room: "Design Review Meeting",
    broadcasting: 156,
    listening: 780,
    cost: 9.36,
    status: "Inactive",
    participants: 6,
  },
];

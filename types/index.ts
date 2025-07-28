export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface MetricData {
  value: string | number;
  unit?: string;
  change: number;
  cost: number;
}

export interface Metrics {
  broadcastingTime: MetricData;
  listeningTime: MetricData;
  totalCost: MetricData & { users: number; rooms: number };
}

export interface ChartDataPoint {
  hour?: string;
  day?: string;
  broadcasting: number;
  listening: number;
}

export interface User {
  user: string;
  broadcasting: number;
  listening: number;
  cost: number;
  status: "Active" | "Inactive" | "Scheduled";
  avatar: string;
}

export interface Room {
  room: string;
  broadcasting: number;
  listening: number;
  cost: number;
  status: "Active" | "Inactive" | "Scheduled";
  participants: number;
}

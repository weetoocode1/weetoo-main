import { Metadata } from "next";
import { ComprehensiveDataClient } from "./page-client";

export const metadata: Metadata = {
  title: "Comprehensive Data | Weetoo",
  description:
    "Access real-time market data, charts, analytics, and trading indicators",
};

export default function ComprehensiveData() {
  return <ComprehensiveDataClient />;
}

import { Metadata } from "next";
import { BrokerPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Partner Exchange Comparison",
  description:
    "Compare Korean cryptocurrency exchanges - fees, features, security, and trading pairs",
};

export default function PartnerExchange() {
  return <BrokerPageClient />;
}

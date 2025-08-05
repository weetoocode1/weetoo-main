import { Metadata } from "next";
import { SponserClient } from "./page-client";

export const metadata: Metadata = {
  title: "Sponsored | Weetoo",
  description: "Explore the most active traders on Weetoo",
};

export default function Sponsored() {
  return <SponserClient />;
}

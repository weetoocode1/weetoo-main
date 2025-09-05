import { Metadata } from "next";
import RebateManagementClient from "./page-client";

export const metadata: Metadata = {
  title: "Rebate Management | Admin",
  description: "Manage broker rebates and user payouts",
};

export default function RebateManagementPage() {
  return <RebateManagementClient />;
}

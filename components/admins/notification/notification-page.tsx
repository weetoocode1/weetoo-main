"use client";

import { Input } from "@/components/ui/input";
import { BellIcon } from "lucide-react";
import { NotificationTabs } from "./notification-tabs";
import { useState } from "react";

export function NotificationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const totalCount = 100; // This should ideally come from your data source

  return (
    <div className="flex flex-col gap-3 h-full container mx-auto ">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3 sm:gap-0">
        <div className="flex items-center gap-2">
          <BellIcon className="size-4" />
          <span className="text-sm font-medium">
            {totalCount} Notifications
          </span>
        </div>

        <div className="max-w-full sm:max-w-[300px] w-full">
          <Input
            placeholder="Search Notifications"
            className="w-full h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border w-full lg:h-full h-fit rounded-lg">
        <NotificationTabs searchTerm={searchTerm} />
      </div>
    </div>
  );
}

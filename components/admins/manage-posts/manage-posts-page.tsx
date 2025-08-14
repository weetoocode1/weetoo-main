"use client";

import { DateRangePicker } from "@/components/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Download, Search, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { PostManagementTable } from "./post-management-table";

interface FiltersState {
  category: string;
  status: string;
  dateRange: DateRange;
}

// Sample data
const samplePosts = [
  {
    id: "1",
    title: "Understanding Cryptocurrency Markets",
    content: "A comprehensive guide to cryptocurrency markets...",
    category: "cryptocurrency",
    status: "approved",
    view_count: 1234,
    created_at: "2024-03-15T10:00:00Z",
    user: {
      first_name: "John",
      last_name: "Doe",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    },
    tags: ["crypto", "trading", "markets"],
    featured_images: [
      "https://picsum.photos/800/400",
      "https://picsum.photos/800/401",
    ],
  },
  {
    id: "2",
    title: "Trading Strategies for Beginners",
    content: "Learn the basics of trading strategies...",
    category: "trading",
    status: "pending",
    view_count: 567,
    created_at: "2024-03-14T15:30:00Z",
    user: {
      first_name: "Jane",
      last_name: "Smith",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
    },
    tags: ["trading", "beginners", "strategy"],
    featured_images: ["https://picsum.photos/800/402"],
  },
  {
    id: "3",
    title: "Investment Portfolio Management",
    content: "How to effectively manage your investment portfolio...",
    category: "investment",
    status: "rejected",
    view_count: 890,
    created_at: "2024-03-13T09:15:00Z",
    user: {
      first_name: "Mike",
      last_name: "Johnson",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    },
    tags: ["investment", "portfolio", "management"],
    featured_images: ["https://picsum.photos/800/403"],
  },
  {
    id: "4",
    title: "The Future of AI in Finance",
    content:
      "Exploring the impact of artificial intelligence on financial markets.",
    category: "technology",
    status: "approved",
    view_count: 2100,
    created_at: "2024-03-12T11:45:00Z",
    user: {
      first_name: "Alice",
      last_name: "Brown",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    },
    tags: ["AI", "finance", "future"],
    featured_images: ["https://picsum.photos/800/404"],
  },
  {
    id: "5",
    title: "Daily Market News Update",
    content: "Catch up on the latest news affecting global markets.",
    category: "news",
    status: "approved",
    view_count: 950,
    created_at: "2024-03-11T08:00:00Z",
    user: {
      first_name: "Bob",
      last_name: "White",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    },
    tags: ["news", "market", "update"],
    featured_images: ["https://picsum.photos/800/405"],
  },
  {
    id: "6",
    title: "Technical Analysis for Day Traders",
    content: "Advanced technical analysis techniques for active traders.",
    category: "analysis",
    status: "approved",
    view_count: 1500,
    created_at: "2024-03-10T14:00:00Z",
    user: {
      first_name: "Charlie",
      last_name: "Green",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
    },
    tags: ["technical analysis", "day trading"],
    featured_images: ["https://picsum.photos/800/406"],
  },
  {
    id: "7",
    title: "A Beginner's Guide to Decentralized Finance (DeFi)",
    content: "Understanding the basics of DeFi and its ecosystem.",
    category: "cryptocurrency",
    status: "hidden",
    view_count: 720,
    created_at: "2024-03-09T17:00:00Z",
    user: {
      first_name: "Diana",
      last_name: "Prince",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
    },
    tags: ["DeFi", "blockchain", "crypto"],
    featured_images: ["https://picsum.photos/800/407"],
  },
  {
    id: "8",
    title: "Q1 2024 Earnings Report Analysis",
    content: "In-depth analysis of major company earnings for Q1 2024.",
    category: "analysis",
    status: "approved",
    view_count: 1800,
    created_at: "2024-03-08T09:30:00Z",
    user: {
      first_name: "Eve",
      last_name: "Adams",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
    },
    tags: ["earnings", "stocks", "market analysis"],
    featured_images: ["https://picsum.photos/800/408"],
  },
  {
    id: "9",
    title: "How to Secure Your Digital Assets",
    content:
      "Best practices for protecting your cryptocurrencies and online investments.",
    category: "technology",
    status: "approved",
    view_count: 1100,
    created_at: "2024-03-07T13:00:00Z",
    user: {
      first_name: "Frank",
      last_name: "Miller",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank",
    },
    tags: ["security", "crypto", "digital assets"],
    featured_images: ["https://picsum.photos/800/409"],
  },
  {
    id: "10",
    title: "The Impact of Global Events on Trading",
    content:
      "Understanding how geopolitical events influence trading decisions.",
    category: "trading",
    status: "approved",
    view_count: 980,
    created_at: "2024-03-06T10:45:00Z",
    user: {
      first_name: "Grace",
      last_name: "Taylor",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace",
    },
    tags: ["global events", "trading", "economy"],
    featured_images: ["https://picsum.photos/800/410"],
  },
  {
    id: "11",
    title: "Basic Economics for Investors",
    content: "A foundational course in economic principles for new investors.",
    category: "investment",
    status: "approved",
    view_count: 1300,
    created_at: "2024-03-05T16:00:00Z",
    user: {
      first_name: "Harry",
      last_name: "Wilson",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Harry",
    },
    tags: ["economics", "investment", "beginners"],
    featured_images: ["https://picsum.photos/800/411"],
  },
  {
    id: "12",
    title: "Top 5 Blockchain Innovations of the Year",
    content:
      "Highlighting the most groundbreaking advancements in blockchain technology.",
    category: "cryptocurrency",
    status: "pending",
    view_count: 650,
    created_at: "2024-03-04T11:00:00Z",
    user: {
      first_name: "Ivy",
      last_name: "Moore",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy",
    },
    tags: ["blockchain", "innovation", "crypto"],
    featured_images: ["https://picsum.photos/800/412"],
  },
  {
    id: "13",
    title: "Navigating Bear Markets",
    content: "Strategies and tips for surviving and thriving in a bear market.",
    category: "trading",
    status: "rejected",
    view_count: 400,
    created_at: "2024-03-03T09:00:00Z",
    user: {
      first_name: "Jack",
      last_name: "Clark",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    },
    tags: ["bear market", "trading tips"],
    featured_images: ["https://picsum.photos/800/413"],
  },
  {
    id: "14",
    title: "Real Estate vs. Stock Market: Where to Invest?",
    content: "A comparison of two major investment avenues.",
    category: "investment",
    status: "approved",
    view_count: 1900,
    created_at: "2024-03-02T14:30:00Z",
    user: {
      first_name: "Kelly",
      last_name: "Lewis",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kelly",
    },
    tags: ["real estate", "stocks", "investment comparison"],
    featured_images: ["https://picsum.photos/800/414"],
  },
  {
    id: "15",
    title: "Cybersecurity Trends 2024",
    content: "An overview of the most critical cybersecurity trends this year.",
    category: "technology",
    status: "approved",
    view_count: 1050,
    created_at: "2024-03-01T10:00:00Z",
    user: {
      first_name: "Leo",
      last_name: "Walker",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    },
    tags: ["cybersecurity", "trends", "technology"],
    featured_images: ["https://picsum.photos/800/415"],
  },
];

export function ManagePostsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FiltersState>({
    category: "all",
    status: "all",
    dateRange: {
      from: undefined,
      to: undefined,
    },
  });

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((value) => {
    if (typeof value === "object" && value !== null) {
      return value.from || value.to;
    }
    return value !== "all";
  }).length;

  const handleFilterChange = <K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { from: range?.from, to: range?.to },
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: "all",
      status: "all",
      dateRange: {
        from: undefined,
        to: undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-9 shadow-none h-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={handleDateRangeChange}
          />
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange("category", value)}
          >
            <SelectTrigger className="w-full md:w-[150px] h-10 shadow-none cursor-pointer">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="analysis">Analysis</SelectItem>
              <SelectItem value="tutorial">Tutorial</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger className="w-full md:w-[150px] h-10 shadow-none cursor-pointer">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="default"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
            className="h-10 px-4 font-normal shadow-none cursor-pointer w-full md:w-auto"
          >
            Clear Filters
          </Button>
          <Button
            variant="outline"
            className="h-10 cursor-pointer shadow-none w-full md:w-auto"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Export</span>
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.category !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Category: {filters.category}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleFilterChange("category", "all")}
              />
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Status: {filters.status}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleFilterChange("status", "all")}
              />
            </Badge>
          )}
          {filters.dateRange.from && (
            <Badge variant="secondary" className="text-xs">
              From: {format(filters.dateRange.from, "PP")}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() =>
                  handleDateRangeChange({
                    ...filters.dateRange,
                    from: undefined,
                  })
                }
              />
            </Badge>
          )}
          {filters.dateRange.to && (
            <Badge variant="secondary" className="text-xs">
              To: {format(filters.dateRange.to, "PP")}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() =>
                  handleDateRangeChange({ ...filters.dateRange, to: undefined })
                }
              />
            </Badge>
          )}
        </div>
      )}

      <PostManagementTable
        searchTerm={searchTerm}
        filters={filters}
        posts={samplePosts}
        loading={false}
        onApprovePost={async () => {}}
        onRejectPost={async () => {}}
        onToggleVisibility={async () => {}}
        onDeletePost={async () => {}}
      />
    </div>
  );
}

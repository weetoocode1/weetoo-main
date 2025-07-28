"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface Competition {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  competition_url: string;
  created_at: string;
  status: string;
}

interface DisplayItem {
  type: "competition" | "empty";
  data: Competition | null;
}

const ITEMS_PER_PAGE = 12;

export function PastEvents() {
  const [currentPage, setCurrentPage] = useState(1);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to parse time string (e.g., "2:30 PM")
  const parseTimeString = (timeStr: string) => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour = hours;

    if (period === "PM" && hours !== 12) {
      hour += 12;
    } else if (period === "AM" && hours === 12) {
      hour = 0;
    }

    return { hours: hour, minutes };
  };

  // Helper function to create full datetime
  const createDateTime = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    const { hours, minutes } = parseTimeString(timeStr);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Helper function to check if competition has ended (real-time)
  const isCompetitionEnded = (competition: Competition) => {
    const now = new Date();
    const endDateTime = createDateTime(
      competition.end_date,
      competition.end_time
    );
    return now.getTime() > endDateTime.getTime();
  };

  // Fetch competitions
  const fetchCompetitions = async () => {
    try {
      const response = await fetch("/api/competitions");
      if (response.ok) {
        const data = await response.json();
        setCompetitions(data.competitions || []);
      } else {
        console.error("Failed to fetch competitions");
      }
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch competitions on component mount
  useEffect(() => {
    fetchCompetitions();
  }, []);

  // Filter competitions to show only completed ones (real-time)
  const completedCompetitions = competitions.filter((competition) =>
    isCompetitionEnded(competition)
  );

  const totalPages = Math.ceil(completedCompetitions.length / ITEMS_PER_PAGE);
  const currentCompetitions = completedCompetitions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Create array of items to display (only actual competitions)
  const displayItems: DisplayItem[] = [];

  // Add only actual competitions
  currentCompetitions.forEach((competition) => {
    displayItems.push({
      type: "competition",
      data: competition,
    });
  });

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index} className="rounded-none flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </CardContent>
              <div className="px-6 pb-4">
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && displayItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold">No Past Competitions</h3>
          <p className="text-muted-foreground max-w-md">
            No completed competitions yet. Past competitions will appear here
            once they finish.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayItems.map((item, index) => (
          <Card
            key={item.data?.id || `competition-${index}`}
            className="rounded-none flex flex-col"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  <span className="text-2xl mr-2">🏆</span>
                  {item.data?.name || "Unknown Competition"}
                </CardTitle>
              </div>
              <CardDescription>
                {item.data?.description || "No description available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Start:</strong>{" "}
                  {item.data ? formatDate(item.data.start_date) : "N/A"} at{" "}
                  {item.data?.start_time || "N/A"}
                </p>
                <p>
                  <strong>End:</strong>{" "}
                  {item.data ? formatDate(item.data.end_date) : "N/A"} at{" "}
                  {item.data?.end_time || "N/A"}
                </p>
              </div>
            </CardContent>
            <div className="px-6">
              <Badge
                variant="outline"
                className="text-muted-foreground w-full rounded-none flex items-center justify-center text-sm border border-border h-10"
              >
                Completed
              </Badge>
            </div>
          </Card>
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === i + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(i + 1);
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

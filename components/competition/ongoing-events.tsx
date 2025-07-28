"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { AddCompetitionDialog } from "./add-competition-dialog";
import { ManagePermissionsDialog } from "./manage-permissions-dialog";

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

interface Permission {
  userId: string;
  name: string;
  email: string;
  grantedAt: string;
}

const ITEMS_PER_PAGE = 12;

export function OngoingEvents() {
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompetitionPermission, setHasCompetitionPermission] =
    useState(false);

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

  // Fetch user role, competitions, and competition permissions
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data, error }) => {
      const sessionId = data.user?.id || null;

      if (error) {
        console.error("Failed to get user:", error);
        setUserRole(null);
        return;
      }

      if (!sessionId) {
        setUserRole(null);
        return;
      }

      // Fetch user role
      supabase
        .from("users")
        .select("role")
        .eq("id", sessionId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to fetch user role:", error);
            setUserRole(null);
          } else {
            setUserRole(data?.role || null);
          }
        });

      // Fetch competition permissions
      fetchCompetitionPermissions(sessionId);
    });

    fetchCompetitions();
  }, []);

  // Function to fetch competition permissions
  const fetchCompetitionPermissions = async (sessionId: string) => {
    try {
      const response = await fetch("/api/competition-permissions");
      const data = await response.json();

      if (data.permissions) {
        const hasPermission = data.permissions.some(
          (permission: Permission) => permission.userId === sessionId
        );
        setHasCompetitionPermission(hasPermission);
      }
    } catch (error) {
      console.error("Error fetching competition permissions:", error);
    }
  };

  // Function to refresh permissions (called when permissions change)
  const handlePermissionsChange = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await fetchCompetitionPermissions(user.id);
    }
  };

  // Refresh competitions when dialog closes (after creating a new competition)
  useEffect(() => {
    if (!dialogOpen) {
      fetchCompetitions();
    }
  }, [dialogOpen]);

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

  // Helper function to check if competition is in progress (real-time)
  const isCompetitionInProgress = (competition: Competition) => {
    const now = new Date();
    const startDateTime = createDateTime(
      competition.start_date,
      competition.start_time
    );
    const endDateTime = createDateTime(
      competition.end_date,
      competition.end_time
    );
    return (
      now.getTime() >= startDateTime.getTime() &&
      now.getTime() <= endDateTime.getTime()
    );
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

  // Helper function to check if competition has started (real-time)
  const isCompetitionStarted = (competition: Competition) => {
    const now = new Date();
    const startDateTime = createDateTime(
      competition.start_date,
      competition.start_time
    );
    return now.getTime() >= startDateTime.getTime();
  };

  // Filter competitions to show only ongoing ones (not ended yet)
  const ongoingCompetitions = competitions.filter(
    (competition) => !isCompetitionEnded(competition)
  );

  const totalPages = Math.ceil(ongoingCompetitions.length / ITEMS_PER_PAGE);

  const currentCompetitions = ongoingCompetitions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Check if user has admin privileges
  const isAdmin = ["admin", "super_admin"].includes(userRole || "");

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Helper function to get competition status display (real-time)
  const getCompetitionStatus = (competition: Competition) => {
    if (isCompetitionInProgress(competition)) {
      return "In Progress";
    }
    if (isCompetitionStarted(competition)) {
      return "Active";
    }
    return "Active"; // Before start time
  };

  // Helper function to check if user can join competition (real-time)
  const canJoinCompetition = (competition: Competition) => {
    // Users can join if competition hasn't started yet (active status)
    return !isCompetitionStarted(competition);
  };

  // Handle competition button click
  const handleCompetitionClick = (competition: Competition) => {
    if (competition?.competition_url) {
      // Validate URL before opening
      try {
        const url = new URL(competition.competition_url);
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      } catch (error) {
        console.error("Invalid competition URL:", error);
      }
    }
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
        {(isAdmin || hasCompetitionPermission) && (
          <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        )}
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
      <div className="space-y-4">
        {(isAdmin || hasCompetitionPermission) && (
          <div className="flex justify-end gap-3">
            {isAdmin && (
              <ManagePermissionsDialog
                open={permissionsDialogOpen}
                onOpenChange={setPermissionsDialogOpen}
                onPermissionsChange={handlePermissionsChange}
              />
            )}
            <AddCompetitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold">No Ongoing Competitions</h3>
            <p className="text-muted-foreground max-w-md">
              There are currently no active competitions. Check back later for
              new opportunities to test your trading skills!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(isAdmin || hasCompetitionPermission) && (
        <div className="flex justify-end gap-3">
          {isAdmin && (
            <ManagePermissionsDialog
              open={permissionsDialogOpen}
              onOpenChange={setPermissionsDialogOpen}
              onPermissionsChange={handlePermissionsChange}
            />
          )}
          <AddCompetitionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </div>
      )}
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
              {item.data && canJoinCompetition(item.data) ? (
                <Button
                  size="sm"
                  className="rounded-none w-full h-10"
                  onClick={() => handleCompetitionClick(item.data!)}
                >
                  Join Competition
                </Button>
              ) : (
                <Badge
                  variant="outline"
                  className="text-green-500 w-full rounded-none flex items-center justify-center text-sm h-10"
                >
                  {item.data ? getCompetitionStatus(item.data) : "Unknown"}
                </Badge>
              )}
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

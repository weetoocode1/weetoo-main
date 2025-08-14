"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CreateNoteDialog } from "./create-note-dialog";
import { EditNoteDialog } from "./edit-note-dialog";
import { ViewNoteDialog } from "./view-note-dialog";

interface AdminNote {
  id: string;
  user_id: string | null;
  note: string;
  priority: "High" | "Medium" | "Low";
  created_by: string;
  date: string;
  created_at: string;
  updated_at: string | null;
  // Joined user data
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function AdminNotesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [, setIsUiBusy] = useState(false);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [selectedNote, setSelectedNote] = useState<AdminNote | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "create" | "view" | "edit" | null
  >(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F: Focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Ctrl/Cmd + K: Focus search input (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape: Clear search and close dialogs
      if (e.key === "Escape") {
        if (searchTerm) {
          setSearchTerm("");
          setDebouncedSearchTerm("");
        }
        if (openDialog) {
          setOpenDialog(null);
        }
        return;
      }

      // Arrow keys for navigation (when no dialog is open)
      if (!openDialog && tableRef.current) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const focusableElements = tableRef.current.querySelectorAll(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          const currentIndex = Array.from(focusableElements).findIndex(
            (el) => el === document.activeElement
          );

          if (currentIndex >= 0) {
            const nextIndex =
              e.key === "ArrowDown"
                ? Math.min(currentIndex + 1, focusableElements.length - 1)
                : Math.max(currentIndex - 1, 0);
            (focusableElements[nextIndex] as HTMLElement)?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm, openDialog]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const queryClient = useQueryClient();

  // Fetch admin notes with user and creator data
  const {
    data: notes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-notes"],
    queryFn: async (): Promise<AdminNote[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("admin_notes")
        .select(
          `
          *,
          user:users!admin_notes_user_id_fkey(
            first_name,
            last_name,
            email
          ),
          creator:users!admin_notes_created_by_fkey(
            first_name,
            last_name,
            role
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("admin_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      return noteId;
    },
    onSuccess: () => {
      // Invalidate both queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notes-stats"] });
      toast.success("Note deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    },
  });

  // Filter and sort notes
  const filteredNotes =
    notes?.filter((note) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        note.note.toLowerCase().includes(searchLower) ||
        (note.user_id &&
          note.user?.first_name?.toLowerCase().includes(searchLower)) ||
        (note.user_id &&
          note.user?.last_name?.toLowerCase().includes(searchLower)) ||
        (note.user_id &&
          note.user?.email?.toLowerCase().includes(searchLower)) ||
        note.creator?.first_name?.toLowerCase().includes(searchLower) ||
        note.creator?.last_name?.toLowerCase().includes(searchLower) ||
        (searchLower.includes("general") && !note.user_id); // Search for general notes

      const matchesPriority =
        priorityFilter === "all" || note.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotes = filteredNotes.slice(startIndex, endIndex);

  // UI busy indicator
  useEffect(() => {
    setIsUiBusy(true);
    const timer = setTimeout(() => setIsUiBusy(false), 150);
    return () => clearTimeout(timer);
  }, [debouncedSearchTerm, priorityFilter, currentPage]);

  const getPriorityConfig = (priority: string) => {
    const configs = {
      High: {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        icon: AlertTriangle,
      },
      Medium: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        icon: Clock,
      },
      Low: {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-300",
        icon: FileText,
      },
    };
    return configs[priority as keyof typeof configs] || configs.Low;
  };

  const handleDeleteNote = async (noteId: string) => {
    deleteNoteMutation.mutate(noteId);
    setDeleteNoteId(null); // Close the dialog
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border rounded-none p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-10">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search notes... (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 shadow-none rounded-none h-10"
            />
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32 shadow-none rounded-none h-10">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setOpenDialog("create")}
            className="shadow-none rounded-none h-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Note
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div ref={tableRef}>
        {currentNotes.length === 0 ? (
          <div className="border border-border rounded-none relative overflow-hidden p-8 text-center">
            {/* Corner borders */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />
            <div className="text-muted-foreground">
              <div className="text-lg font-medium mb-2">No notes found</div>
              <div className="text-sm">
                {searchTerm || priorityFilter !== "all"
                  ? "Try adjusting your search criteria"
                  : "Create your first admin note to get started"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentNotes.map((note) => {
              const priorityConfig = getPriorityConfig(note.priority);
              const PriorityIcon = priorityConfig.icon;
              const userName = note.user
                ? `${note.user.first_name} ${note.user.last_name}`
                : "Unknown User";
              const creatorName = note.creator
                ? `${note.creator.first_name} ${note.creator.last_name}`
                : "Unknown Admin";

              return (
                <div
                  key={note.id}
                  className="group border border-border rounded-none p-4 relative overflow-hidden hover:bg-muted/20 transition-all duration-200 hover:shadow-sm"
                >
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-lg ${priorityConfig.bg} transition-colors duration-200`}
                    >
                      <PriorityIcon
                        className={`h-4 w-4 ${priorityConfig.text}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-6 line-clamp-2">
                            {note.note}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedNote(note);
                                setOpenDialog("view");
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedNote(note);
                                setOpenDialog("edit");
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteNoteId(note.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        {note.user_id ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              User:{" "}
                              <span className="font-medium text-foreground">
                                {userName}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span>General Note</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            Created by:{" "}
                            <span className="font-medium text-foreground">
                              {creatorName}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {new Date(note.created_at).toLocaleDateString(
                              "en-GB"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredNotes.length)}{" "}
            of {filteredNotes.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-none h-8"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                if (
                  totalPages <= 5 ||
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-none"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="rounded-none h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {openDialog === "create" && (
        <CreateNoteDialog
          open={openDialog === "create"}
          onOpenChange={(open) => {
            if (!open) {
              setOpenDialog(null);
              setSelectedNote(null);
            }
          }}
          onNoteCreated={() => {
            setOpenDialog(null);
            setSelectedNote(null);
            // Reset to first page when new note is created
            setCurrentPage(1);
            refetch();
          }}
        />
      )}

      {openDialog === "view" && selectedNote && (
        <ViewNoteDialog
          note={selectedNote}
          open={openDialog === "view"}
          onOpenChange={(open) => {
            if (!open) {
              setOpenDialog(null);
              setSelectedNote(null);
            }
          }}
        />
      )}

      {openDialog === "edit" && selectedNote && (
        <EditNoteDialog
          note={selectedNote}
          open={openDialog === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setOpenDialog(null);
              setSelectedNote(null);
            }
          }}
          onNoteUpdated={() => {
            setOpenDialog(null);
            setSelectedNote(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteNoteId}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}
              className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

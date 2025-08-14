"use client";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EditNoteDialog } from "./edit-note-dialog";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Generate more mock data
const generateMockNotes = (): Note[] => {
  const categories = ["general", "user", "system", "security", "maintenance"];
  const admins = [
    { id: "admin1", name: "John Doe" },
    { id: "admin2", name: "Jane Smith" },
    { id: "admin3", name: "Mike Johnson" },
    { id: "admin4", name: "Sarah Wilson" },
    { id: "admin5", name: "David Brown" },
  ];

  return Array.from({ length: 100 }, (_, index) => ({
    id: (index + 1).toString(),
    title: `Note ${index + 1}: ${
      [
        "System Update",
        "Security Alert",
        "Maintenance Notice",
        "Feature Release",
        "Bug Fix",
      ][index % 5]
    }`,
    content: `This is a detailed note about ${
      [
        "system updates",
        "security alerts",
        "maintenance schedules",
        "feature releases",
        "bug fixes",
      ][index % 5]
    }. It contains important information that needs to be reviewed by the admin team.`,
    category: categories[index % categories.length],
    createdAt: new Date(2024, 6, index + 1),
    updatedAt: new Date(2024, 6, index + 1),
    createdBy: admins[index % admins.length],
  }));
};

const mockNotes = generateMockNotes();

interface AdminNotesTableProps {
  searchQuery: string;
  category: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}

export function AdminNotesTable({
  searchQuery,
  category,
  notes,
  onNotesChange,
}: AdminNotesTableProps) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Initialize with mock data if no notes exist
  useEffect(() => {
    if (notes.length === 0) {
      onNotesChange(mockNotes);
    }
  }, [notes.length, onNotesChange]);

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || note.category === category;
    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotes = filteredNotes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
      user: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      system:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      security: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      maintenance:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    };
    return colors[category] || colors.general;
  };

  const handleDelete = (note: Note) => {
    setNoteToDelete(note);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (noteToDelete) {
      const updatedNotes = notes.filter((note) => note.id !== noteToDelete.id);
      onNotesChange(updatedNotes);
      toast.success("Note deleted successfully");
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setIsEditDialogOpen(true);
  };

  const handleNoteUpdate = (updatedNote: Note) => {
    const updatedNotes = notes.map((note) =>
      note.id === updatedNote.id
        ? { ...updatedNote, updatedAt: new Date() }
        : note
    );
    onNotesChange(updatedNotes);
    toast.success("Note updated successfully");
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[300px] min-w-[200px]">Title</TableHead>
              <TableHead className="min-w-[100px]">Category</TableHead>
              <TableHead className="min-w-[150px]">Created By</TableHead>
              <TableHead className="min-w-[150px]">Created At</TableHead>
              <TableHead className="min-w-[150px]">Updated At</TableHead>
              <TableHead className="text-right min-w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentNotes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No notes found
                </TableCell>
              </TableRow>
            ) : (
              currentNotes.map((note) => (
                <TableRow key={note.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setSelectedNote(note);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <span className="cursor-pointer hover:text-primary transition-colors line-clamp-1">
                        {note.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(note.category)}>
                      {note.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={note.createdBy.avatar} />
                        <AvatarFallback>
                          {note.createdBy.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="line-clamp-1">
                        {note.createdBy.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(note.createdAt, "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(note.updatedAt, "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(note)}
                        className="h-8 w-8 shrink-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(note)}
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination and Items Per Page */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {/* Pagination numbers */}
              <div className="hidden sm:flex items-center gap-2">
                {(() => {
                  const pagesToShow: (number | string)[] = [];
                  const startRange = Math.max(1, currentPage - 1);
                  const endRange = Math.min(totalPages, currentPage + 3);

                  if (startRange > 1) {
                    pagesToShow.push(1);
                    if (startRange > 2) {
                      pagesToShow.push("...");
                    }
                  }

                  for (let i = startRange; i <= endRange; i++) {
                    pagesToShow.push(i);
                  }

                  if (endRange < totalPages) {
                    if (endRange < totalPages - 1) {
                      pagesToShow.push("...");
                    }
                    pagesToShow.push(totalPages);
                  }

                  return (
                    <>
                      {pagesToShow.map((page, index) =>
                        page === "..." ? (
                          <span key={`ellipsis-${index}`} className="px-2">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={
                              currentPage === Number(page)
                                ? "default"
                                : "outline"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(Number(page))}
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </>
                  );
                })()}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* View Note Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedNote?.title}</DialogTitle>
            <DialogDescription>
              <div className="mt-4 space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedNote?.content}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={getCategoryColor(selectedNote?.category || "")}
                  >
                    {selectedNote?.category}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Created by {selectedNote?.createdBy.name} on{" "}
                    {selectedNote?.createdAt &&
                      format(selectedNote.createdAt, "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              note &quot;{noteToDelete?.title}&quote;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive dark:text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Note Dialog */}
      <EditNoteDialog
        note={selectedNote}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onNoteUpdate={handleNoteUpdate}
      />
    </>
  );
}

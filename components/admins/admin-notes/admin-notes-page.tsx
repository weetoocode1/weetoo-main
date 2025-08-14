"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { AdminNotesTable } from "./admin-notes-table";
import { CreateNoteDialog } from "./create-note-dialog";

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

export function AdminNotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);

  const handleNoteCreated = (newNote: Note) => {
    setNotes((prevNotes) => [newNote, ...prevNotes]);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border mt-5 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Admin Notes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create and manage important notes and comments for the admin team
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Note
        </Button>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px] h-10">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="user">User Related</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes Table */}
      <AdminNotesTable
        searchQuery={searchQuery}
        category={selectedCategory}
        notes={notes}
        onNotesChange={setNotes}
      />

      {/* Create Note Dialog */}
      <CreateNoteDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onNoteCreated={handleNoteCreated}
      />
    </div>
  );
}

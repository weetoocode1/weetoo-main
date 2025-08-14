"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Shield,
  User,
} from "lucide-react";

interface ViewNoteDialogProps {
  note: {
    id: string;
    user_id: string | null;
    note: string;
    priority: "High" | "Medium" | "Low";
    date: string;
    created_by: string;
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
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewNoteDialog({
  note,
  open,
  onOpenChange,
}: ViewNoteDialogProps) {
  const getPriorityConfig = (priority: string) => {
    const configs = {
      High: {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        icon: AlertTriangle,
        label: "High Priority",
      },
      Medium: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        icon: Clock,
        label: "Medium Priority",
      },
      Low: {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-300",
        icon: FileText,
        label: "Low Priority",
      },
    };
    return configs[priority as keyof typeof configs] || configs.Low;
  };

  const priorityConfig = getPriorityConfig(note.priority);
  const PriorityIcon = priorityConfig.icon;
  const userName = note.user
    ? `${note.user.first_name} ${note.user.last_name}`
    : "Unknown User";
  const creatorName = note.creator
    ? `${note.creator.first_name} ${note.creator.last_name}`
    : "Unknown Admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Admin Note Details
          </DialogTitle>
          <DialogDescription>
            View comprehensive information about this admin note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Note Header */}
          <div className="flex items-start gap-4 p-4 bg-muted/20 border border-border rounded-lg">
            <div className={`p-3 rounded-lg ${priorityConfig.bg}`}>
              <PriorityIcon className={`h-6 w-6 ${priorityConfig.text}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{priorityConfig.label}</h3>
              <p className="text-sm text-muted-foreground">
                Note ID: {note.id}
              </p>
            </div>
          </div>

          {/* Note Content */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Note Content</Label>
            <div className="p-4 bg-muted/30 border border-border rounded-lg min-h-[100px]">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {note.note}
              </p>
            </div>
          </div>

          {/* User Information */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">User Information</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 flex items-center justify-center rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="text-base font-semibold text-foreground">
                    {userName}
                  </div>
                  {note.user?.email && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {note.user.email}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="w-8 h-8 bg-purple-100 flex items-center justify-center rounded-lg">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Created By
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {creatorName}
                  </div>
                  {note.creator?.role && (
                    <div className="text-xs text-muted-foreground capitalize">
                      {note.creator.role}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dates and Metadata */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dates and Metadata</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="w-8 h-8 bg-green-100 flex items-center justify-center rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Note Date</div>
                  <div className="text-sm font-medium">
                    {new Date(note.date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="w-8 h-8 bg-orange-100 flex items-center justify-center rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Created At
                  </div>
                  <div className="text-sm font-medium">
                    {new Date(note.created_at).toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleTimeString("en-GB")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated (if exists) */}
          {note.updated_at && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Last Updated</Label>
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="w-8 h-8 bg-yellow-100 flex items-center justify-center rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {new Date(note.updated_at).toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(note.updated_at).toLocaleTimeString("en-GB")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

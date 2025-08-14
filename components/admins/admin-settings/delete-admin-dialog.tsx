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

interface DeleteAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteAdminDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteAdminDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Remove Admin</DialogTitle>
          <DialogDescription className="text-sm">
            Are you sure you want to remove this admin? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            Remove Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface WarningDialogProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    warningCount: number;
    avatar_url?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWarningIssued: () => void;
}

export function WarningDialog({
  user,
  open,
  onOpenChange,
  onWarningIssued,
}: WarningDialogProps) {
  const [warningData, setWarningData] = useState({
    warningType: "",
    warningNumber: "",
    reason: "",
    notifyUser: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Prefill next warning number when dialog opens
  useEffect(() => {
    if (!open || !user?.id) return;

    const fetchNextWarningNumber = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_warnings")
          .select("warning_number")
          .eq("user_id", user.id)
          .order("warning_number", { ascending: false })
          .limit(1);

        if (error) return;

        const nextWarningNumber =
          ((data?.[0]?.warning_number as number | undefined) || 0) + 1;
        setWarningData((prev) => ({
          ...prev,
          warningNumber: String(nextWarningNumber),
        }));
      } catch {
        // silently ignore; keep empty if fetch fails
      }
    };

    fetchNextWarningNumber();
  }, [open, user?.id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [warningData.reason]);

  const handleSubmit = async () => {
    // Form validation
    if (
      !warningData.warningType ||
      !warningData.warningNumber ||
      !warningData.reason.trim()
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Insert the warning
      const { error } = await supabase.from("user_warnings").insert({
        user_id: user.id,
        warning_type: warningData.warningType,
        reason: warningData.reason.trim(),
        warning_number: parseInt(warningData.warningNumber),
        notify_user: warningData.notifyUser,
        issued_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      // Reset form and close dialog
      setWarningData({
        warningType: "",
        warningNumber: "",
        reason: "",
        notifyUser: true,
      });
      onWarningIssued();
      onOpenChange(false);
    } catch (error) {
      console.error("Error issuing warning:", error);
      alert("Failed to issue warning. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate fallback initials
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName && firstName.length > 0 ? firstName.charAt(0) : "U";
    const last = lastName && lastName.length > 0 ? lastName.charAt(0) : "N";
    return `${first}${last}`.toUpperCase();
  };

  // Check if form is valid
  const isFormValid =
    warningData.warningType &&
    warningData.warningNumber &&
    warningData.reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Issue Warning
          </DialogTitle>
          <DialogDescription>
            Issue a warning to {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        {/* User Info Section */}
        <div className="flex items-center space-x-4 p-4 border border-border rounded-none">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={user.avatar_url}
                alt={`${user.first_name} ${user.last_name}`}
              />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              {user.email}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Warnings: {user.warningCount}
              </span>
            </div>
          </div>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warning Type */}
            <div className="space-y-2">
              <Label htmlFor="warningType" className="text-sm font-medium">
                Warning Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={warningData.warningType}
                onValueChange={(value) =>
                  setWarningData((prev) => ({ ...prev, warningType: value }))
                }
                required
              >
                <SelectTrigger className="h-10 rounded-none">
                  <SelectValue placeholder="Select warning type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor Violation</SelectItem>
                  <SelectItem value="moderate">Moderate Violation</SelectItem>
                  <SelectItem value="major">Major Violation</SelectItem>
                  <SelectItem value="severe">Severe Violation</SelectItem>
                  <SelectItem value="spam">Spam/Abuse</SelectItem>
                  <SelectItem value="inappropriate_content">
                    Inappropriate Content
                  </SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="cheating">Cheating/Exploits</SelectItem>
                  <SelectItem value="language">
                    Inappropriate Language
                  </SelectItem>
                  <SelectItem value="trolling">Trolling/Disruption</SelectItem>
                  <SelectItem value="policy_violation">
                    Policy Violation
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning Number */}
            <div className="space-y-2">
              <Label htmlFor="warningNumber" className="text-sm font-medium">
                Warning Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="warningNumber"
                type="number"
                value={warningData.warningNumber}
                onChange={(e) =>
                  setWarningData((prev) => ({
                    ...prev,
                    warningNumber: e.target.value,
                  }))
                }
                className="h-10 rounded-none"
                placeholder="Enter warning number"
                min="1"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              ref={textareaRef}
              id="reason"
              value={warningData.reason}
              onChange={(e) =>
                setWarningData((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              className="min-h-[100px] resize-none rounded-none"
              style={{
                wordBreak: "break-all",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
              placeholder="Enter the reason for this warning..."
              required
            />
          </div>

          {/* Notify User */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notifyUser"
              checked={warningData.notifyUser as boolean}
              onCheckedChange={(checked) =>
                setWarningData((prev) => ({
                  ...prev,
                  notifyUser: checked as boolean,
                }))
              }
            />
            <Label htmlFor="notifyUser" className="text-sm">
              Notify user about this warning
            </Label>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="h-10 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? "Issuing..." : "Issue Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

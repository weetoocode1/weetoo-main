"use client";

import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar } from "../ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";

interface AddCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCompetitionDialog({
  open,
  onOpenChange,
}: AddCompetitionDialogProps) {
  // Helper function to format date
  const formatDate = (date: Date | undefined) => {
    if (!date) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Helper function to validate date
  const isValidDate = (date: Date | undefined) => {
    if (!date) {
      return false;
    }
    return !isNaN(date.getTime());
  };

  // Helper function to check if date is in the past
  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    date.setHours(0, 0, 0, 0); // Reset time to start of day
    return date < today;
  };

  // Helper function to check if time is in the past for a given date
  const isTimeInPast = (
    date: Date,
    hour: string,
    minute: string,
    ampm: string
  ) => {
    const now = new Date();
    const selectedDate = new Date(date);

    // Convert to 24-hour format
    let hour24 = parseInt(hour);
    if (ampm === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    selectedDate.setHours(hour24, parseInt(minute), 0, 0);

    return selectedDate <= now;
  };

  // Helper function to get disabled dates for calendar
  const getDisabledDates = (date: Date) => {
    return isDateInPast(date);
  };

  // Helper function to get current time in 12-hour format
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Convert to 12-hour format
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";

    return {
      hour: hour12.toString(),
      minute: minutes.toString().padStart(2, "0"),
      ampm,
    };
  };

  const currentTime = getCurrentTime();

  const [competitionDate, setCompetitionDate] = useState<Date>(new Date());
  const [competitionDateOpen, setCompetitionDateOpen] = useState(false);
  const [competitionDateMonth, setCompetitionDateMonth] = useState<
    Date | undefined
  >(new Date());
  const [competitionDateValue, setCompetitionDateValue] = useState(
    formatDate(new Date())
  );
  const [competitionHour, setCompetitionHour] = useState(currentTime.hour);
  const [competitionMinute, setCompetitionMinute] = useState(
    currentTime.minute
  );
  const [competitionAMPM, setCompetitionAMPM] = useState(currentTime.ampm);
  const [competitionEndDate, setCompetitionEndDate] = useState<Date>(
    new Date()
  );
  const [competitionEndDateOpen, setCompetitionEndDateOpen] = useState(false);
  const [competitionEndDateMonth, setCompetitionEndDateMonth] = useState<
    Date | undefined
  >(new Date());
  const [competitionEndDateValue, setCompetitionEndDateValue] = useState(
    formatDate(new Date())
  );
  const [competitionEndHour, setCompetitionEndHour] = useState(
    currentTime.hour
  );
  const [competitionEndMinute, setCompetitionEndMinute] = useState(
    currentTime.minute
  );
  const [competitionEndAMPM, setCompetitionEndAMPM] = useState(
    currentTime.ampm
  );
  const [competitionUrl, setCompetitionUrl] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionDescription, setCompetitionDescription] = useState("");

  // Helper function to count words
  const countWords = (text: string) => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  const wordCount = countWords(competitionDescription);
  const isOverLimit = wordCount > 200;

  // Check if start time is in the past
  const isStartTimeInPast = isTimeInPast(
    competitionDate,
    competitionHour,
    competitionMinute,
    competitionAMPM
  );

  // Check if end time is in the past
  const isEndTimeInPast = isTimeInPast(
    competitionEndDate,
    competitionEndHour,
    competitionEndMinute,
    competitionEndAMPM
  );

  const handleSubmit = async () => {
    if (!competitionName.trim()) {
      toast.error("Please enter a competition name");
      return;
    }

    if (!competitionDescription.trim()) {
      toast.error("Please enter a competition description");
      return;
    }

    // Check if start time is in the past
    if (
      isTimeInPast(
        competitionDate,
        competitionHour,
        competitionMinute,
        competitionAMPM
      )
    ) {
      toast.error("Start time cannot be in the past");
      return;
    }

    // Check if end time is in the past
    if (
      isTimeInPast(
        competitionEndDate,
        competitionEndHour,
        competitionEndMinute,
        competitionEndAMPM
      )
    ) {
      toast.error("End time cannot be in the past");
      return;
    }

    // Validate that end date/time is after start date/time
    const startDateTime = new Date(competitionDate);
    const endDateTime = new Date(competitionEndDate);

    // Set the time for start and end dates
    const [startHour, startMinute] = [
      parseInt(competitionHour),
      parseInt(competitionMinute),
    ];
    const [endHour, endMinute] = [
      parseInt(competitionEndHour),
      parseInt(competitionEndMinute),
    ];

    // Convert to 24-hour format
    const startHour24 =
      competitionAMPM === "PM" && startHour !== 12
        ? startHour + 12
        : competitionAMPM === "AM" && startHour === 12
        ? 0
        : startHour;
    const endHour24 =
      competitionEndAMPM === "PM" && endHour !== 12
        ? endHour + 12
        : competitionEndAMPM === "AM" && endHour === 12
        ? 0
        : endHour;

    startDateTime.setHours(startHour24, startMinute, 0, 0);
    endDateTime.setHours(endHour24, endMinute, 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error("End date/time must be after start date/time");
      return;
    }

    try {
      const response = await fetch("/api/competitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: competitionName,
          description: competitionDescription,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          startTime: `${competitionHour}:${competitionMinute} ${competitionAMPM}`,
          endTime: `${competitionEndHour}:${competitionEndMinute} ${competitionEndAMPM}`,
          competitionUrl: competitionUrl,
        }),
      });

      if (response.ok) {
        toast.success("Competition created successfully!");
        onOpenChange(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create competition");
      }
    } catch (error) {
      console.error("Error creating competition:", error);
      toast.error("Failed to create competition");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const resetForm = () => {
    setCompetitionName("");
    setCompetitionDescription("");
    setCompetitionDate(new Date());
    setCompetitionDateValue(formatDate(new Date()));
    setCompetitionHour(currentTime.hour);
    setCompetitionMinute(currentTime.minute);
    setCompetitionAMPM(currentTime.ampm);
    setCompetitionEndDate(new Date());
    setCompetitionEndDateValue(formatDate(new Date()));
    setCompetitionEndHour(currentTime.hour);
    setCompetitionEndMinute(currentTime.minute);
    setCompetitionEndAMPM(currentTime.ampm);
    setCompetitionUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-none h-10">
          <PlusIcon className="w-4 h-4" />
          Add New Competition
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>Add New Competition</DialogTitle>
          <DialogDescription>
            Create a new competition to join.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="competition-name">Competition Name</Label>
            <Input
              id="competition-name"
              type="text"
              placeholder="Enter competition name"
              className="rounded-none h-10 !bg-transparent"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="competition-description">
              Competition Description
            </Label>
            <Textarea
              id="competition-description"
              placeholder="Enter competition description"
              className="rounded-none h-24 resize-none !bg-transparent"
              value={competitionDescription}
              onChange={(e) => setCompetitionDescription(e.target.value)}
            />
            <div className="flex justify-between items-center text-xs">
              <span
                className={
                  isOverLimit
                    ? "text-red-500"
                    : wordCount > 180
                    ? "text-yellow-500"
                    : "text-muted-foreground"
                }
              >
                {wordCount}/200 words
              </span>
              {isOverLimit && (
                <span className="text-red-500 font-medium">
                  Word limit exceeded
                </span>
              )}
            </div>
          </div>

          {/* Start Date & Time */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-3 w-full">
              <Label htmlFor="start-date-picker" className="px-1">
                Start Date
              </Label>
              <div className="relative flex gap-2">
                <Input
                  id="start-date-picker"
                  value={competitionDateValue}
                  placeholder="June 01, 2025"
                  className="pr-10 rounded-none h-10 !bg-transparent"
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setCompetitionDateValue(e.target.value);
                    if (isValidDate(date)) {
                      setCompetitionDate(date);
                      setCompetitionDateMonth(date);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCompetitionDateOpen(true);
                    }
                  }}
                />
                <Popover
                  open={competitionDateOpen}
                  onOpenChange={setCompetitionDateOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date-picker-button"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                      <CalendarIcon className="size-3.5" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={competitionDate}
                      captionLayout="dropdown"
                      month={competitionDateMonth}
                      onMonthChange={setCompetitionDateMonth}
                      onSelect={(date) => {
                        if (date) {
                          setCompetitionDate(date);
                          setCompetitionDateValue(formatDate(date));
                          setCompetitionDateOpen(false);
                        }
                      }}
                      disabled={getDisabledDates}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="start-time-picker" className="px-1">
                Start Time
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={competitionHour}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "" ||
                      (parseInt(value) >= 1 && parseInt(value) <= 12)
                    ) {
                      setCompetitionHour(value);
                    }
                  }}
                  placeholder="12"
                  className={`h-10 rounded-none !bg-transparent text-center ${
                    isStartTimeInPast
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <span className="flex items-center text-muted-foreground">
                  :
                </span>
                <Input
                  type="text"
                  value={competitionMinute}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Allow empty string
                    if (value === "") {
                      setCompetitionMinute("");
                      return;
                    }

                    // Only allow digits
                    if (!/^\d+$/.test(value)) {
                      return;
                    }

                    const numValue = parseInt(value);

                    // Check if it's a valid minute (0-59)
                    if (numValue >= 0 && numValue <= 59) {
                      // Format: single digit gets leading zero, double digit stays as is
                      if (value.length === 1) {
                        setCompetitionMinute(`0${value}`);
                      } else {
                        setCompetitionMinute(value);
                      }
                    }
                  }}
                  placeholder="00"
                  className={`h-10 rounded-none !bg-transparent text-center ${
                    isStartTimeInPast
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <Select
                  value={competitionAMPM}
                  onValueChange={setCompetitionAMPM}
                >
                  <SelectTrigger
                    className={`h-10 rounded-none ${
                      isStartTimeInPast
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isStartTimeInPast && (
                <p className="text-xs text-red-500">
                  Start time cannot be in the past
                </p>
              )}
            </div>
          </div>

          {/* End Date & Time */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-3 w-full">
              <Label htmlFor="end-date-picker" className="px-1">
                End Date
              </Label>
              <div className="relative flex gap-2">
                <Input
                  id="end-date-picker"
                  value={competitionEndDateValue}
                  placeholder="June 01, 2025"
                  className="pr-10 rounded-none h-10 !bg-transparent"
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setCompetitionEndDateValue(e.target.value);
                    if (isValidDate(date)) {
                      setCompetitionEndDate(date);
                      setCompetitionEndDateMonth(date);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCompetitionEndDateOpen(true);
                    }
                  }}
                />
                <Popover
                  open={competitionEndDateOpen}
                  onOpenChange={setCompetitionEndDateOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date-picker-button"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                      <CalendarIcon className="size-3.5" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={competitionEndDate}
                      captionLayout="dropdown"
                      month={competitionEndDateMonth}
                      onMonthChange={setCompetitionEndDateMonth}
                      onSelect={(date) => {
                        if (date) {
                          setCompetitionEndDate(date);
                          setCompetitionEndDateValue(formatDate(date));
                          setCompetitionEndDateOpen(false);
                        }
                      }}
                      disabled={getDisabledDates}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="end-time-picker" className="px-1">
                End Time
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={competitionEndHour}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "" ||
                      (parseInt(value) >= 1 && parseInt(value) <= 12)
                    ) {
                      setCompetitionEndHour(value);
                    }
                  }}
                  placeholder="12"
                  className={`h-10 rounded-none !bg-transparent text-center ${
                    isEndTimeInPast ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
                <span className="flex items-center text-muted-foreground">
                  :
                </span>
                <Input
                  type="text"
                  value={competitionEndMinute}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Allow empty string
                    if (value === "") {
                      setCompetitionEndMinute("");
                      return;
                    }

                    // Only allow digits
                    if (!/^\d+$/.test(value)) {
                      return;
                    }

                    const numValue = parseInt(value);

                    // Check if it's a valid minute (0-59)
                    if (numValue >= 0 && numValue <= 59) {
                      // Format: single digit gets leading zero, double digit stays as is
                      if (value.length === 1) {
                        setCompetitionEndMinute(`0${value}`);
                      } else {
                        setCompetitionEndMinute(value);
                      }
                    }
                  }}
                  placeholder="00"
                  className={`h-10 rounded-none !bg-transparent text-center ${
                    isEndTimeInPast ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
                <Select
                  value={competitionEndAMPM}
                  onValueChange={setCompetitionEndAMPM}
                >
                  <SelectTrigger
                    className={`h-10 rounded-none ${
                      isEndTimeInPast
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isEndTimeInPast && (
                <p className="text-xs text-red-500">
                  End time cannot be in the past
                </p>
              )}
            </div>
          </div>

          {/* Competition URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="competition-url">Competition URL</Label>
            <Input
              id="competition-url"
              type="url"
              placeholder="https://example.com/competition"
              className="rounded-none h-10 !bg-transparent"
              value={competitionUrl}
              onChange={(e) => setCompetitionUrl(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="rounded-none">
              Create Competition
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

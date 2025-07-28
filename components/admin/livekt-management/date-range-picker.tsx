"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({ date, setDate }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-4 w-full sm:w-fit">
      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Quick Select */}
      {/* <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <span>Quick Select</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0">
          <div className="p-2">
            <div className="grid gap-1">
              <Button
                variant="ghost"
                className="justify-start font-normal"
                onClick={() =>
                  setDate({
                    from: addDays(new Date(), -7),
                    to: new Date(),
                  })
                }
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal"
                onClick={() =>
                  setDate({
                    from: addDays(new Date(), -30),
                    to: new Date(),
                  })
                }
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal"
                onClick={() =>
                  setDate({
                    from: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1
                    ),
                    to: new Date(),
                  })
                }
              >
                This month
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal"
                onClick={() =>
                  setDate({
                    from: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth() - 1,
                      1
                    ),
                    to: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      0
                    ),
                  })
                }
              >
                Last month
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover> */}
    </div>
  );
}

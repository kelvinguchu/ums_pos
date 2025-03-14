"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function ShadcnDatePicker({
  date,
  setDate,
  className,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className='relative'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className
            )}>
            <CalendarIcon className='mr-2 h-4 w-4' />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-auto p-0'
          align='start'
          style={{ zIndex: 9999, position: "relative" }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", zIndex: 10000 }}>
            <Calendar
              mode='single'
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                setTimeout(() => setOpen(false), 100);
              }}
              initialFocus
              disabled={(date) => {
                // Disable future dates
                return date > new Date();
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

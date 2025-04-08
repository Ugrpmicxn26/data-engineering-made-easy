
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export interface SelectWithSearchOption {
  value: string;
  label: string;
}

interface SelectWithSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectWithSearchOption[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
}

export function SelectWithSearch({
  value,
  onValueChange,
  options,
  placeholder = "Search columns...",
  emptyMessage = "No columns found.",
  className,
  triggerClassName,
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedOption = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", triggerClassName)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", className)} style={{width: "var(--radix-popover-trigger-width)"}}>
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  onValueChange(currentValue);
                  setOpen(false);
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

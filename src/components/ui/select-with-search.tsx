
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
import { ensureArray } from "@/utils/type-correction";
import { superSafeToArray, isSafelyIterable } from "@/utils/iterableUtils";

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
  options = [], // Default empty array
  placeholder = "Search columns...",
  emptyMessage = "No columns found.",
  className,
  triggerClassName,
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false);
  
  // Ensure we have a valid options array with multiple safety checks
  const safeOptions = React.useMemo(() => {
    // Handle null/undefined case first
    if (options === null || options === undefined) {
      console.warn("SelectWithSearch received null/undefined options");
      return [];
    }
    
    // Check if options is iterable
    if (!isSafelyIterable(options)) {
      console.warn("SelectWithSearch received non-iterable options:", options);
      return [];
    }
    
    // Protection for primitive string
    if (typeof options === 'string') {
      return [];
    }
    
    // Use multiple methods to ensure valid options
    try {
      // First try with superSafeToArray
      const result = superSafeToArray<SelectWithSearchOption>(options);
      
      // If that fails, try with ensureArray
      if (!result || result.length === 0) {
        try {
          const backupResult = ensureArray<SelectWithSearchOption>(options);
          
          // Add filtering to ensure each option has valid properties
          return backupResult.filter(
            option => option && typeof option === 'object' && 'value' in option && 'label' in option
          );
        } catch (e) {
          console.error("Error in SelectWithSearch backup conversion:", e);
          return [];
        }
      }
      
      // Add filtering to ensure each option has valid properties
      return result.filter(
        option => option && typeof option === 'object' && 'value' in option && 'label' in option
      );
    } catch (e) {
      console.error("Critical error processing options in SelectWithSearch:", e);
      return [];
    }
  }, [options]);
  
  // Find the selected option safely
  const selectedOption = React.useMemo(() => {
    if (!safeOptions || safeOptions.length === 0) return null;
    
    try {
      return safeOptions.find(option => option && option.value === value) || null;
    } catch (e) {
      console.warn("Error finding selected option:", e);
      return null;
    }
  }, [safeOptions, value]);

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
            {safeOptions.map((option, index) => (
              <CommandItem
                key={`${option.value}-${index}`}
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

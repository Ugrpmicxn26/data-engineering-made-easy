
import * as React from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchableDropdownProps {
  trigger: React.ReactNode;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  align?: "center" | "start" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export const SearchableDropdown = ({
  trigger,
  options,
  value,
  onSelect,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className,
  align = "center",
  side = "bottom",
}: SearchableDropdownProps) => {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleExternalSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!open) {
      setOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder={`Search ${placeholder.toLowerCase()}...`}
          value={searchQuery}
          onChange={handleExternalSearch}
          className="pl-8 w-full"
        />
        <Search className="h-4 w-4 absolute left-2.5 top-3 text-muted-foreground" />
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 absolute right-1 top-1"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent 
          className={cn("p-0", className)} 
          align={align} 
          side={side}
          sideOffset={4}
        >
          <Command>
            <CommandInput 
              placeholder={searchPlaceholder} 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            {filteredOptions.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup className="max-h-60 overflow-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onSelect(currentValue);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

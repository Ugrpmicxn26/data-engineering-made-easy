
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover,
  PopoverTrigger,
  PopoverContent 
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  SlidersHorizontal, 
  Columns2, 
  Filter, 
  ArrowRightLeft,
  X,
  Plus
} from "lucide-react";
import { ColumnInfo } from "@/utils/fileUtils";
import { SelectWithSearch } from "@/components/ui/select-with-search";

interface TableControlsProps {
  columns: string[];
  onToggleColumns: (columns: string[]) => void;
  onFilterRows: (filters: RowFilter[]) => void;
  onPivot: (config: PivotConfig | null) => void;
  columnInfo?: Record<string, ColumnInfo>;
}

export interface RowFilter {
  column: string;
  value: string;
  exclude: boolean;
}

export interface PivotConfig {
  pivotColumn: string;
  valueColumn: string;
}

const TableControls: React.FC<TableControlsProps> = ({
  columns,
  onToggleColumns,
  onFilterRows,
  onPivot,
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns);
  const [rowFilters, setRowFilters] = useState<RowFilter[]>([]);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig | null>(null);
  
  const handleColumnToggle = (column: string) => {
    const updatedColumns = selectedColumns.includes(column)
      ? selectedColumns.filter(col => col !== column)
      : [...selectedColumns, column];
    
    setSelectedColumns(updatedColumns);
    onToggleColumns(updatedColumns);
  };

  const addRowFilter = () => {
    if (columns.length === 0) return;
    
    const newFilter: RowFilter = {
      column: columns[0],
      value: "",
      exclude: false
    };
    
    setRowFilters([...rowFilters, newFilter]);
  };

  const updateRowFilter = (index: number, field: keyof RowFilter, value: any) => {
    const updatedFilters = [...rowFilters];
    updatedFilters[index] = { ...updatedFilters[index], [field]: value };
    setRowFilters(updatedFilters);
    onFilterRows(updatedFilters);
  };

  const removeRowFilter = (index: number) => {
    const updatedFilters = rowFilters.filter((_, i) => i !== index);
    setRowFilters(updatedFilters);
    onFilterRows(updatedFilters);
  };

  const handlePivotChange = (field: keyof PivotConfig, value: string) => {
    if (!value) {
      setPivotConfig(null);
      onPivot(null);
      return;
    }

    const newConfig = pivotConfig 
      ? { ...pivotConfig, [field]: value }
      : { pivotColumn: field === 'pivotColumn' ? value : '', valueColumn: field === 'valueColumn' ? value : '' };
    
    setPivotConfig(newConfig);
    
    if (newConfig.pivotColumn && newConfig.valueColumn) {
      onPivot(newConfig);
    }
  };

  const resetPivot = () => {
    setPivotConfig(null);
    onPivot(null);
  };

  const columnOptions = columns.map(column => ({
    value: column,
    label: column
  }));

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Columns2 className="h-4 w-4" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-4 border-b">
            <h4 className="font-medium">Toggle Columns</h4>
            <p className="text-xs text-muted-foreground">
              Select which columns to display
            </p>
          </div>
          <div className="p-2 max-h-[300px] overflow-auto">
            {columns.map((column) => (
              <div key={column} className="flex items-center space-x-2 p-2">
                <Checkbox 
                  id={`column-${column}`}
                  checked={selectedColumns.includes(column)}
                  onCheckedChange={() => handleColumnToggle(column)}
                />
                <Label htmlFor={`column-${column}`} className="text-sm cursor-pointer">
                  {column}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter Rows</span>
            {rowFilters.length > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                {rowFilters.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <h4 className="font-medium">Filter Rows</h4>
            <p className="text-xs text-muted-foreground">
              Include or exclude rows based on values
            </p>
          </div>
          
          <div className="p-2">
            <Accordion type="single" collapsible className="w-full">
              {rowFilters.map((filter, index) => (
                <AccordionItem key={index} value={`filter-${index}`}>
                  <AccordionTrigger className="py-2 px-4 text-sm">
                    <div className="flex items-center justify-between w-full mr-2">
                      <span>
                        {filter.exclude ? "Exclude" : "Include"} rows where{" "}
                        <span className="font-medium">{filter.column}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRowFilter(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-2">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Column</Label>
                          <SelectWithSearch
                            value={filter.column}
                            onValueChange={(value) => updateRowFilter(index, "column", value)}
                            options={columnOptions}
                            placeholder="Select column"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Mode</Label>
                          <Select
                            value={filter.exclude ? "exclude" : "include"}
                            onValueChange={(value) => 
                              updateRowFilter(index, "exclude", value === "exclude")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="include">Include rows</SelectItem>
                              <SelectItem value="exclude">Exclude rows</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                          placeholder="Filter value"
                          value={filter.value}
                          onChange={(e) => updateRowFilter(index, "value", e.target.value)}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 text-xs"
              onClick={addRowFilter}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-8 gap-1 ${pivotConfig ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Pivot Table</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <h4 className="font-medium">Pivot Table Configuration</h4>
            <p className="text-xs text-muted-foreground">
              Transform your data into a pivot table
            </p>
          </div>
          
          <div className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Pivot Column (Categories)</Label>
              <SelectWithSearch
                value={pivotConfig?.pivotColumn || ""}
                onValueChange={(value) => handlePivotChange("pivotColumn", value)}
                options={[
                  { value: "", label: "None" },
                  ...columnOptions
                ]}
                placeholder="Select pivot column"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Values from this column will become new columns
              </p>
            </div>
            
            <div>
              <Label className="text-xs">Value Column</Label>
              <SelectWithSearch
                value={pivotConfig?.valueColumn || ""}
                onValueChange={(value) => handlePivotChange("valueColumn", value)}
                options={[
                  { value: "", label: "None" },
                  ...columnOptions
                ]}
                placeholder="Select value column"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Values from this column will populate the pivot table
              </p>
            </div>
            
            {pivotConfig && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full mt-2"
                onClick={resetPivot}
              >
                Reset Pivot
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TableControls;

import React, { useState, useEffect, useMemo } from "react";
import { RowsIcon, ListFilter, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, DropRowsTabState } from "./types";
import { generateCSV } from "@/utils/fileUtils";
import { toast } from "sonner";

const DropRowsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = useState<DropRowsTabState>({
    dropRowsFile: null,
    dropRowsColumn: null,
    dropRowsValues: ""
  });
  
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [keepSelected, setKeepSelected] = useState(false);
  
  // Get unique values when column is selected
  useEffect(() => {
    if (state.dropRowsFile && state.dropRowsColumn) {
      const fileData = files.find(file => file.id === state.dropRowsFile)?.data;
      if (fileData) {
        const values = fileData
          .map(row => String(row[state.dropRowsColumn!] || "").trim())
          .filter(Boolean);
          
        // Get unique values and sort them
        const unique = [...new Set(values)].sort();
        setUniqueValues(unique);
        setSelectedValues([]);
      }
    } else {
      setUniqueValues([]);
      setSelectedValues([]);
    }
  }, [state.dropRowsFile, state.dropRowsColumn, files]);
  
  // Filter values based on search term
  const filteredValues = useMemo(() => {
    if (!searchValue.trim()) return uniqueValues;
    return uniqueValues.filter(value => 
      value.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [uniqueValues, searchValue]);
  
  const handleToggleValue = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };
  
  const selectAllFiltered = () => {
    setSelectedValues(prev => {
      const newSelection = [...prev];
      filteredValues.forEach(value => {
        if (!newSelection.includes(value)) {
          newSelection.push(value);
        }
      });
      return newSelection;
    });
  };
  
  const clearAllFiltered = () => {
    setSelectedValues(prev => 
      prev.filter(value => !filteredValues.includes(value))
    );
  };

  const handleFilterRows = () => {
    if (!state.dropRowsFile || !state.dropRowsColumn || selectedValues.length === 0) {
      toast.error("Please select a file, column, and at least one value to filter");
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.dropRowsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      // Filter rows based on selected values
      const filteredData = fileToModify.data.filter(row => {
        const columnValue = String(row[state.dropRowsColumn!] || "").trim();
        const valueIsSelected = selectedValues.includes(columnValue);
        
        // Keep selected rows or filter them out based on toggle
        return keepSelected ? valueIsSelected : !valueIsSelected;
      });
      
      // Generate new CSV content and calculate size
      const newContent = generateCSV(filteredData);
      const newSize = new Blob([newContent]).size;

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.dropRowsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: filteredData,
          content: newContent,
          size: newSize
        };
        
        onComplete(filteredData, updatedFiles);
        toast.success(`Successfully filtered to ${filteredData.length} rows (${keepSelected ? "kept" : "removed"} ${selectedValues.length} values)`);
      }
    } catch (error) {
      console.error("Error filtering rows:", error);
      toast.error("Failed to filter rows");
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Filter Rows Configuration" 
        description="Select a file, choose a column, and specify which values to keep or remove."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="mb-4">
          <label className="text-sm font-medium">Select File</label>
          <Select
            value={state.dropRowsFile || ""}
            onValueChange={(value) => {
              setState({
                dropRowsFile: value,
                dropRowsColumn: null,
                dropRowsValues: ""
              });
            }}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Choose a file" />
            </SelectTrigger>
            <SelectContent>
              {selectedFiles.map(file => (
                <SelectItem key={file.id} value={file.id}>
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {state.dropRowsFile && (
          <>
            <div className="mb-4">
              <label className="text-sm font-medium">Select Column to Filter On</label>
              <Select
                value={state.dropRowsColumn || ""}
                onValueChange={(value) => setState(prev => ({ ...prev, dropRowsColumn: value }))}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a column" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFiles
                    .find(f => f.id === state.dropRowsFile)
                    ?.columns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {state.dropRowsColumn && (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="filter-mode"
                    checked={keepSelected}
                    onCheckedChange={setKeepSelected}
                  />
                  <Label htmlFor="filter-mode" className="cursor-pointer">
                    {keepSelected ? "Keep selected values" : "Remove selected values"}
                  </Label>
                </div>
              
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">
                      Select Values ({selectedValues.length} of {uniqueValues.length} selected)
                    </label>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllFiltered}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearAllFiltered}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative mb-2">
                    <Input
                      placeholder="Search values..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="pl-8"
                    />
                    <ListFilter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {selectedValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedValues.slice(0, 5).map(value => (
                        <Badge 
                          key={value} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {value}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleToggleValue(value)}
                          />
                        </Badge>
                      ))}
                      {selectedValues.length > 5 && (
                        <Badge variant="outline">
                          +{selectedValues.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {filteredValues.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredValues.map(value => (
                          <div key={value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`value-${value}`}
                              checked={selectedValues.includes(value)}
                              onCheckedChange={() => handleToggleValue(value)}
                            />
                            <label
                              htmlFor={`value-${value}`}
                              className="text-sm truncate cursor-pointer"
                            >
                              {value}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">No values found</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleFilterRows}
          disabled={!state.dropRowsFile || !state.dropRowsColumn || selectedValues.length === 0 || isProcessing}
          variant="destructive"
          className="hover-scale"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <RowsIcon className="mr-2 h-4 w-4" />
              {keepSelected ? "Keep Selected Rows" : "Filter Out Selected Rows"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DropRowsTab;

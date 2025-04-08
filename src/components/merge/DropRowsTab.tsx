
import React, { useState, useEffect, useMemo } from "react";
import { RowsIcon, ListFilter, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SelectWithSearch } from "@/components/ui/select-with-search";
import { ensureArray } from "@/utils/type-correction";
import type { FileData } from "@/utils/fileUtils";

const DropRowsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = useState<DropRowsTabState>({
    dropRowsFile: null,
    dropRowsColumn: null,
    dropRowsValues: ""
  });
  
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [keepSelected, setKeepSelected] = useState(false);
  
  const safeFiles = ensureArray<FileData>(files || []);
  const safeSelectedFiles = ensureArray<FileData>(selectedFiles || []);
  
  const fileOptions = useMemo(() => 
    safeSelectedFiles
      .filter(file => file && typeof file === 'object')
      .map(file => ({
        value: file.id,
        label: file.name
      })), 
    [safeSelectedFiles]
  );

  const columnOptions = useMemo(() => {
    if (!state.dropRowsFile) return [];
    
    const selectedFile = safeSelectedFiles.find(f => f && f.id === state.dropRowsFile);
    if (!selectedFile) return [];
    
    const safeColumns = ensureArray<string>(selectedFile.columns || []);
    return safeColumns.map(column => ({
      value: String(column),
      label: String(column)
    }));
  }, [state.dropRowsFile, safeSelectedFiles]);

  useEffect(() => {
    if (state.dropRowsFile && state.dropRowsColumn) {
      const selectedFile = safeFiles.find(file => file && file.id === state.dropRowsFile);
      const fileData = selectedFile?.data;
      
      if (fileData && Array.isArray(fileData)) {
        const values = fileData
          .filter(row => row !== null && typeof row === 'object')
          .map(row => String(row[state.dropRowsColumn!] || "").trim())
          .filter(Boolean);
          
        const unique = [...new Set(values)].sort();
        setUniqueValues(unique);
        setSelectedValues([]);
      } else {
        setUniqueValues([]);
      }
    } else {
      setUniqueValues([]);
      setSelectedValues([]);
    }
  }, [state.dropRowsFile, state.dropRowsColumn, safeFiles]);
  
  const handleToggleValue = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };
  
  const selectAllValues = () => {
    setSelectedValues(uniqueValues);
  };
  
  const clearAllValues = () => {
    setSelectedValues([]);
  };

  const handleFilterRows = () => {
    if (!state.dropRowsFile || !state.dropRowsColumn || selectedValues.length === 0) {
      toast.error("Please select a file, column, and at least one value to filter");
      return;
    }

    try {
      const fileToModify = safeFiles.find(file => file && file.id === state.dropRowsFile);
      if (!fileToModify || !Array.isArray(fileToModify.data)) {
        toast.error("File data not found");
        return;
      }

      const filteredData = fileToModify.data.filter(row => {
        if (!row || typeof row !== 'object') return false;
        const columnValue = String(row[state.dropRowsColumn!] || "").trim();
        const valueIsSelected = selectedValues.includes(columnValue);
        
        return keepSelected ? valueIsSelected : !valueIsSelected;
      });
      
      const newContent = generateCSV(filteredData);
      const newSize = new Blob([newContent]).size;

      const updatedFiles = [...safeFiles];
      const fileIndex = updatedFiles.findIndex(f => f && f.id === state.dropRowsFile);
      
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

  const handleFileChange = (fileId: string) => {
    setState({
      dropRowsFile: fileId,
      dropRowsColumn: null,
      dropRowsValues: ""
    });
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
          <SelectWithSearch
            value={state.dropRowsFile || ""}
            onValueChange={handleFileChange}
            options={fileOptions}
            placeholder="Choose a file"
            className="w-full"
            triggerClassName="mt-1"
          />
        </div>
        
        {state.dropRowsFile && (
          <>
            <div className="mb-4">
              <label className="text-sm font-medium">Select Column to Filter On</label>
              <SelectWithSearch
                value={state.dropRowsColumn || ""}
                onValueChange={(value) => setState(prev => ({ ...prev, dropRowsColumn: value }))}
                options={columnOptions}
                placeholder="Choose a column"
                className="w-full"
                triggerClassName="mt-1"
              />
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
                        onClick={selectAllValues}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearAllValues}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
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
                    {uniqueValues.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {uniqueValues.map(value => (
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

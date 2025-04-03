import React from "react";
import { Trash2, ColumnsIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, DropColumnsTabState } from "./types";
import { excludeColumns, generateCSV } from "@/utils/fileUtils";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const DropColumnsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<DropColumnsTabState>({
    dropColumnsFile: null,
    columnsToExclude: [],
    mode: "drop"
  });

  const handleToggleExcludeColumn = (column: string) => {
    setState(prev => ({
      ...prev,
      columnsToExclude: prev.columnsToExclude.includes(column) 
        ? prev.columnsToExclude.filter(col => col !== column) 
        : [...prev.columnsToExclude, column]
    }));
  };

  const handleDropColumns = () => {
    if (!state.dropColumnsFile || state.columnsToExclude.length === 0) {
      toast.error(`Please select a file and columns to ${state.mode === "drop" ? "drop" : "keep"}`);
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.dropColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const allColumns = fileToModify.columns;
      
      let columnsToExclude: string[];
      
      if (state.mode === "drop") {
        columnsToExclude = [...state.columnsToExclude];
      } else {
        columnsToExclude = allColumns.filter(col => !state.columnsToExclude.includes(col));
      }

      const modifiedData = fileToModify.data.map(row => {
        const newRow = { ...row };
        columnsToExclude.forEach(column => {
          delete newRow[column];
        });
        return newRow;
      });

      const remainingColumns = fileToModify.columns.filter(col => !columnsToExclude.includes(col));
      
      const newContent = generateCSV(modifiedData);
      const newSize = new Blob([newContent]).size;

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.dropColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: modifiedData,
          columns: remainingColumns,
          content: newContent,
          size: newSize
        };
        
        onComplete(modifiedData, updatedFiles);
        
        const actionText = state.mode === "drop" ? "dropped" : "kept";
        const columnCount = state.mode === "drop" ? columnsToExclude.length : remainingColumns.length;
        toast.success(`Successfully ${actionText} ${columnCount} columns`);
      }
    } catch (error) {
      console.error("Error processing columns:", error);
      toast.error(`Failed to ${state.mode === "drop" ? "drop" : "keep"} columns`);
    } finally {
      setState(prev => ({ ...prev, columnsToExclude: [] }));
    }
  };

  const handleModeChange = (mode: "drop" | "keep") => {
    setState(prev => ({ ...prev, mode, columnsToExclude: [] }));
  };

  const selectedCount = state.columnsToExclude.length;
  
  const totalColumns = selectedFiles.find(f => f.id === state.dropColumnsFile)?.columns.length || 0;
  
  const remainingCount = state.mode === "drop" 
    ? totalColumns - selectedCount 
    : selectedCount;

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Column Selection" 
        description="Choose columns to keep or drop from your data file."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="mb-4">
          <label className="text-sm font-medium">Select File</label>
          <Select
            value={state.dropColumnsFile || ""}
            onValueChange={(value) => {
              setState({
                ...state,
                dropColumnsFile: value,
                columnsToExclude: []
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
        
        {state.dropColumnsFile && (
          <>
            <div className="mt-6 mb-4">
              <Tabs 
                value={state.mode} 
                onValueChange={(value) => handleModeChange(value as "drop" | "keep")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="drop" className="flex gap-1.5 items-center">
                    <Trash2 className="h-3.5 w-3.5" />
                    Drop Selected
                  </TabsTrigger>
                  <TabsTrigger value="keep" className="flex gap-1.5 items-center">
                    <Check className="h-3.5 w-3.5" />
                    Keep Selected
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
                <span className="flex items-center">
                  {state.mode === "drop" ? (
                    <Trash2 className="h-3.5 w-3.5 inline mr-1.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5 inline mr-1.5" />
                  )}
                  {state.mode === "drop" ? "Select Columns to Drop" : "Select Columns to Keep"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} selected / {remainingCount} will remain
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2 max-h-60 overflow-y-auto border rounded-md p-2">
                {selectedFiles
                  .find(f => f.id === state.dropColumnsFile)
                  ?.columns.map(column => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${state.dropColumnsFile}-${column}`}
                        checked={state.columnsToExclude.includes(column)}
                        onCheckedChange={() => handleToggleExcludeColumn(column)}
                      />
                      <label
                        htmlFor={`column-${state.dropColumnsFile}-${column}`}
                        className="text-sm truncate cursor-pointer"
                      >
                        {column}
                      </label>
                    </div>
                  ))}
              </div>
              
              <div className="mt-3 text-xs text-right">
                <button 
                  onClick={() => {
                    const file = selectedFiles.find(f => f.id === state.dropColumnsFile);
                    if (file) {
                      setState(prev => ({
                        ...prev,
                        columnsToExclude: [...file.columns]
                      }));
                    }
                  }}
                  className="text-primary hover:underline mr-3"
                >
                  Select All
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, columnsToExclude: [] }))}
                  className="text-primary hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleDropColumns}
          disabled={!state.dropColumnsFile || state.columnsToExclude.length === 0 || isProcessing}
          variant={state.mode === "drop" ? "destructive" : "default"}
          className="hover-scale"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              {state.mode === "drop" ? (
                <Trash2 className="mr-2 h-4 w-4" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {state.mode === "drop" ? "Drop Selected Columns" : "Keep Selected Columns"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DropColumnsTab;

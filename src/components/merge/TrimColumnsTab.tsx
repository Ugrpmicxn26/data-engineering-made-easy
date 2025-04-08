import React from "react";
import { Scissors, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, TrimColumnsTabState } from "./types";
import { trimColumnValues } from "@/utils/fileUtils";
import { toast } from "sonner";
import { SelectWithSearch } from "@/components/ui/select-with-search";

const TrimColumnsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<TrimColumnsTabState>({
    trimColumnsFile: null,
    columnsToTrim: []
  });

  const handleToggleTrimColumn = (column: string) => {
    setState(prev => ({
      ...prev,
      columnsToTrim: prev.columnsToTrim.includes(column) 
        ? prev.columnsToTrim.filter(col => col !== column) 
        : [...prev.columnsToTrim, column]
    }));
  };

  const handleTrimColumns = () => {
    if (!state.trimColumnsFile || state.columnsToTrim.length === 0) {
      toast.error("Please select a file and columns to trim");
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.trimColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const trimmedData = trimColumnValues(fileToModify.data, state.columnsToTrim);

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.trimColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: trimmedData
        };
        
        onComplete(trimmedData, updatedFiles);
        toast.success(`Successfully trimmed values in ${state.columnsToTrim.length} columns`);
      }
    } catch (error) {
      console.error("Error trimming columns:", error);
      toast.error("Failed to trim column values");
    } finally {
      setState(prev => ({ ...prev, columnsToTrim: [] }));
    }
  };

  // Convert files to options format for SelectWithSearch
  const fileOptions = selectedFiles.map(file => ({
    value: file.id,
    label: file.name
  }));

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Trim Values Configuration" 
        description="Select a file and choose which columns to trim whitespace from (leading and trailing spaces)."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="mb-4">
          <label className="text-sm font-medium">Select File</label>
          <SelectWithSearch
            value={state.trimColumnsFile || ""}
            onValueChange={(value) => {
              setState({
                trimColumnsFile: value,
                columnsToTrim: []
              });
            }}
            options={fileOptions}
            placeholder="Choose a file"
            className="w-full"
            triggerClassName="mt-1"
          />
        </div>
        
        {state.trimColumnsFile && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              <Scissors className="h-3.5 w-3.5 inline mr-1.5" />
              Select Columns to Trim
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {selectedFiles
                .find(f => f.id === state.trimColumnsFile)
                ?.columns.map(column => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`trim-${state.trimColumnsFile}-${column}`}
                      checked={state.columnsToTrim.includes(column)}
                      onCheckedChange={() => handleToggleTrimColumn(column)}
                    />
                    <label
                      htmlFor={`trim-${state.trimColumnsFile}-${column}`}
                      className="text-sm truncate cursor-pointer"
                    >
                      {column}
                    </label>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleTrimColumns}
          disabled={!state.trimColumnsFile || state.columnsToTrim.length === 0 || isProcessing}
          className="hover-scale"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Scissors className="mr-2 h-4 w-4" />
              Trim Column Values
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TrimColumnsTab;

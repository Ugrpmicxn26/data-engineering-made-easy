
import React from "react";
import { RowsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, DropRowsTabState } from "./types";
import { filterRows } from "@/utils/fileUtils";
import { toast } from "sonner";

const DropRowsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<DropRowsTabState>({
    dropRowsFile: null,
    dropRowsColumn: null,
    dropRowsValues: ""
  });

  const handleDropRows = () => {
    if (!state.dropRowsFile || !state.dropRowsColumn || !state.dropRowsValues.trim()) {
      toast.error("Please select a file, column, and values to filter");
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.dropRowsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const valuesToDrop = state.dropRowsValues
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const filteredData = fileToModify.data.filter(row => {
        const columnValue = String(row[state.dropRowsColumn!]).trim();
        return !valuesToDrop.includes(columnValue);
      });

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.dropRowsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: filteredData
        };
        
        onComplete(filteredData, updatedFiles);
        toast.success(`Successfully filtered out ${fileToModify.data.length - filteredData.length} rows`);
      }
    } catch (error) {
      console.error("Error dropping rows:", error);
      toast.error("Failed to drop rows");
    } finally {
      setState(prev => ({ ...prev, dropRowsValues: "" }));
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Filter Rows Configuration" 
        description="Select a file, choose a column, and specify values to filter out rows."
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
            
            <div className="mb-4">
              <label className="text-sm font-medium">Values to Filter Out</label>
              <p className="text-xs text-muted-foreground mb-1">
                Enter comma-separated values to remove rows containing these values
              </p>
              <Input
                value={state.dropRowsValues}
                onChange={(e) => setState(prev => ({ ...prev, dropRowsValues: e.target.value }))}
                placeholder="e.g. value1, value2, value3"
                className="mt-1"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleDropRows}
          disabled={!state.dropRowsFile || !state.dropRowsColumn || !state.dropRowsValues.trim() || isProcessing}
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
              Filter Rows
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DropRowsTab;

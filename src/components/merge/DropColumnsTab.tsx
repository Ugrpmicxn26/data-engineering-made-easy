
import React from "react";
import { Trash2, ColumnsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, DropColumnsTabState } from "./types";
import { excludeColumns } from "@/utils/fileUtils";
import { toast } from "sonner";

const DropColumnsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<DropColumnsTabState>({
    dropColumnsFile: null,
    columnsToExclude: []
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
      toast.error("Please select a file and columns to drop");
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.dropColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const modifiedData = fileToModify.data.map(row => {
        const newRow = { ...row };
        state.columnsToExclude.forEach(column => {
          delete newRow[column];
        });
        return newRow;
      });

      const remainingColumns = fileToModify.columns.filter(col => !state.columnsToExclude.includes(col));

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.dropColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: modifiedData,
          columns: remainingColumns
        };
        
        onComplete(modifiedData, updatedFiles);
        toast.success(`Successfully dropped ${state.columnsToExclude.length} columns`);
      }
    } catch (error) {
      console.error("Error dropping columns:", error);
      toast.error("Failed to drop columns");
    } finally {
      setState(prev => ({ ...prev, columnsToExclude: [] }));
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Drop Columns Configuration" 
        description="Select a file and choose which columns to remove from it."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="mb-4">
          <label className="text-sm font-medium">Select File</label>
          <Select
            value={state.dropColumnsFile || ""}
            onValueChange={(value) => {
              setState({
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
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              <Trash2 className="h-3.5 w-3.5 inline mr-1.5" />
              Select Columns to Drop
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {selectedFiles
                .find(f => f.id === state.dropColumnsFile)
                ?.columns.map(column => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`drop-${state.dropColumnsFile}-${column}`}
                      checked={state.columnsToExclude.includes(column)}
                      onCheckedChange={() => handleToggleExcludeColumn(column)}
                    />
                    <label
                      htmlFor={`drop-${state.dropColumnsFile}-${column}`}
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
          onClick={handleDropColumns}
          disabled={!state.dropColumnsFile || state.columnsToExclude.length === 0 || isProcessing}
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
              <Trash2 className="mr-2 h-4 w-4" />
              Drop Selected Columns
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DropColumnsTab;

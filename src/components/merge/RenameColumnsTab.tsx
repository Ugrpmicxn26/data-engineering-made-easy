import React from "react";
import { Tag, CheckCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, RenameColumnsTabState } from "./types";
import { renameColumns } from "@/utils/fileUtils";
import { toast } from "sonner";
import { SelectWithSearch } from "@/components/ui/select-with-search";

const RenameColumnsTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<RenameColumnsTabState>({
    renameColumnsFile: null,
    columnRenames: {}
  });

  const handleSetColumnRename = (column: string, newName: string) => {
    if (!newName.trim()) {
      setState(prev => {
        const updated = { ...prev };
        const newRenames = { ...prev.columnRenames };
        delete newRenames[column];
        updated.columnRenames = newRenames;
        return updated;
      });
    } else {
      setState(prev => ({
        ...prev,
        columnRenames: {
          ...prev.columnRenames,
          [column]: newName.trim()
        }
      }));
    }
  };

  const handleRenameColumns = () => {
    if (!state.renameColumnsFile || Object.keys(state.columnRenames).length === 0) {
      toast.error("Please select a file and rename at least one column");
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.renameColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const renamedData = renameColumns(fileToModify.data, state.columnRenames);

      const updatedColumns = fileToModify.columns.map(col => 
        state.columnRenames[col] ? state.columnRenames[col] : col
      );

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.renameColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: renamedData,
          columns: updatedColumns
        };
        
        onComplete(renamedData, updatedFiles);
        toast.success(`Successfully renamed ${Object.keys(state.columnRenames).length} columns`);
      }
    } catch (error) {
      console.error("Error renaming columns:", error);
      toast.error("Failed to rename columns");
    } finally {
      setState(prev => ({ ...prev, columnRenames: {} }));
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
        title="Rename Columns Configuration" 
        description="Select a file and rename columns by providing new names."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="mb-4">
          <label className="text-sm font-medium">Select File</label>
          <SelectWithSearch
            value={state.renameColumnsFile || ""}
            onValueChange={(value) => {
              setState({
                renameColumnsFile: value,
                columnRenames: {}
              });
            }}
            options={fileOptions}
            placeholder="Choose a file"
            className="w-full"
            triggerClassName="mt-1"
          />
        </div>
        
        {state.renameColumnsFile && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              <Edit className="h-3.5 w-3.5 inline mr-1.5" />
              Rename Columns
            </h4>
            <div className="space-y-2 mt-2">
              {selectedFiles
                .find(f => f.id === state.renameColumnsFile)
                ?.columns.map(column => (
                  <div key={column} className="flex items-center gap-2">
                    <div className="w-1/3 text-sm truncate">{column}</div>
                    <span className="text-muted-foreground">→</span>
                    <Input
                      placeholder="New name"
                      value={state.columnRenames[column] || ""}
                      onChange={(e) => handleSetColumnRename(column, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleRenameColumns}
          disabled={!state.renameColumnsFile || Object.keys(state.columnRenames).length === 0 || isProcessing}
          className="hover-scale"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Apply Column Renames
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default RenameColumnsTab;

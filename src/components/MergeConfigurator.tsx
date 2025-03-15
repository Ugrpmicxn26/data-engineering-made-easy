
import React, { useState, useMemo } from "react";
import { 
  FileData, 
  MergeOptions, 
  mergeDatasets, 
  filterRows, 
  excludeColumns, 
  renameColumns, 
  ColumnInfo 
} from "@/utils/fileUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Layers, 
  MergeIcon, 
  TableIcon, 
  Trash2, 
  ColumnsIcon, 
  RowsIcon, 
  Key, 
  PlusCircle, 
  MinusCircle,
  CheckCircle,
  Tag,
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MergeConfiguratorProps {
  files: FileData[];
  onMergeComplete: (data: any[], updatedFiles?: FileData[]) => void;
}

const MergeConfigurator: React.FC<MergeConfiguratorProps> = ({ files, onMergeComplete }) => {
  const [keyColumns, setKeyColumns] = useState<Record<string, string[]>>({});
  const [includeColumns, setIncludeColumns] = useState<Record<string, string[]>>({});
  const [dropColumnsFile, setDropColumnsFile] = useState<string | null>(null);
  const [columnsToExclude, setColumnsToExclude] = useState<string[]>([]);
  const [dropRowsFile, setDropRowsFile] = useState<string | null>(null);
  const [dropRowsColumn, setDropRowsColumn] = useState<string | null>(null);
  const [dropRowsValues, setDropRowsValues] = useState<string>("");
  const [renameColumnsFile, setRenameColumnsFile] = useState<string | null>(null);
  const [columnRenames, setColumnRenames] = useState<Record<string, string>>({});
  const [currentAction, setCurrentAction] = useState<"merge" | "dropColumns" | "dropRows" | "renameColumns">("merge");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get only selected files
  const selectedFiles = useMemo(() => files.filter(file => file.selected), [files]);

  // Initialize keyColumns and includeColumns when selected files change
  React.useEffect(() => {
    const newKeyColumns: Record<string, string[]> = {};
    const newIncludeColumns: Record<string, string[]> = {};

    selectedFiles.forEach(file => {
      // If there's no key column selected yet, default to the first column
      if (!keyColumns[file.id] || keyColumns[file.id].length === 0) {
        newKeyColumns[file.id] = file.columns.length > 0 ? [file.columns[0]] : [];
      } else {
        newKeyColumns[file.id] = keyColumns[file.id];
      }

      // Default to including all columns
      if (!includeColumns[file.id]) {
        newIncludeColumns[file.id] = [...file.columns];
      } else {
        newIncludeColumns[file.id] = includeColumns[file.id];
      }
    });

    setKeyColumns(prev => ({ ...prev, ...newKeyColumns }));
    setIncludeColumns(prev => ({ ...prev, ...newIncludeColumns }));

    // Reset drop columns/rows if the selected file is no longer available
    if (dropColumnsFile && !selectedFiles.some(f => f.id === dropColumnsFile)) {
      setDropColumnsFile(null);
      setColumnsToExclude([]);
    }
    if (dropRowsFile && !selectedFiles.some(f => f.id === dropRowsFile)) {
      setDropRowsFile(null);
      setDropRowsColumn(null);
      setDropRowsValues("");
    }
    if (renameColumnsFile && !selectedFiles.some(f => f.id === renameColumnsFile)) {
      setRenameColumnsFile(null);
      setColumnRenames({});
    }
  }, [selectedFiles, keyColumns, includeColumns, dropColumnsFile, dropRowsFile, renameColumnsFile]);

  const handleAddKeyColumn = (fileId: string) => {
    const file = selectedFiles.find(f => f.id === fileId);
    if (!file) return;

    // Find a column that's not already selected as a key
    const availableColumns = file.columns.filter(col => 
      !(keyColumns[fileId] || []).includes(col)
    );
    
    if (availableColumns.length > 0) {
      setKeyColumns(prev => ({
        ...prev,
        [fileId]: [...(prev[fileId] || []), availableColumns[0]]
      }));
    }
  };

  const handleRemoveKeyColumn = (fileId: string, columnIndex: number) => {
    setKeyColumns(prev => {
      const updatedColumns = [...(prev[fileId] || [])];
      updatedColumns.splice(columnIndex, 1);
      return { ...prev, [fileId]: updatedColumns };
    });
  };

  const handleKeyColumnChange = (fileId: string, columnIndex: number, value: string) => {
    setKeyColumns(prev => {
      const updatedColumns = [...(prev[fileId] || [])];
      updatedColumns[columnIndex] = value;
      return { ...prev, [fileId]: updatedColumns };
    });
  };

  const handleToggleColumn = (fileId: string, column: string) => {
    setIncludeColumns(prev => {
      const currentColumns = prev[fileId] || [];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter(col => col !== column)
        : [...currentColumns, column];
      return { ...prev, [fileId]: newColumns };
    });
  };

  const handleToggleExcludeColumn = (column: string) => {
    setColumnsToExclude(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column) 
        : [...prev, column]
    );
  };

  const handleSetColumnRename = (column: string, newName: string) => {
    if (!newName.trim()) {
      setColumnRenames(prev => {
        const updated = { ...prev };
        delete updated[column];
        return updated;
      });
    } else {
      setColumnRenames(prev => ({
        ...prev,
        [column]: newName.trim()
      }));
    }
  };

  const handleDropColumns = () => {
    if (!dropColumnsFile || columnsToExclude.length === 0) {
      toast.error("Please select a file and columns to drop");
      return;
    }

    setIsProcessing(true);

    try {
      const fileToModify = files.find(file => file.id === dropColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      // Create a new dataset with the selected columns excluded
      const modifiedData = fileToModify.data.map(row => {
        const newRow = { ...row };
        columnsToExclude.forEach(column => {
          delete newRow[column];
        });
        return newRow;
      });

      // Get the remaining columns
      const remainingColumns = fileToModify.columns.filter(col => !columnsToExclude.includes(col));

      // Update the file in our file list with the new data and columns
      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === dropColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: modifiedData,
          columns: remainingColumns
        };
        
        // Update the file in state by calling onMergeComplete with the modified data and updated files
        onMergeComplete(modifiedData, updatedFiles);
        toast.success(`Successfully dropped ${columnsToExclude.length} columns`);
      }
    } catch (error) {
      console.error("Error dropping columns:", error);
      toast.error("Failed to drop columns");
    } finally {
      setIsProcessing(false);
      setColumnsToExclude([]);  // Reset for next operation
    }
  };

  const handleDropRows = () => {
    if (!dropRowsFile || !dropRowsColumn || !dropRowsValues.trim()) {
      toast.error("Please select a file, column, and values to filter");
      return;
    }

    setIsProcessing(true);

    try {
      const fileToModify = files.find(file => file.id === dropRowsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      // Parse the values to filter (comma-separated)
      const valuesToDrop = dropRowsValues
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      // Filter rows that do NOT have the specified values in the specified column
      const filteredData = fileToModify.data.filter(row => {
        const columnValue = String(row[dropRowsColumn]).trim();
        return !valuesToDrop.includes(columnValue);
      });

      // Update the file in our file list
      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === dropRowsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: filteredData
        };
        
        // Update with filtered data and updated files
        onMergeComplete(filteredData, updatedFiles);
        toast.success(`Successfully filtered out ${fileToModify.data.length - filteredData.length} rows`);
      }
    } catch (error) {
      console.error("Error dropping rows:", error);
      toast.error("Failed to drop rows");
    } finally {
      setIsProcessing(false);
      // Reset form for next operation
      setDropRowsValues("");
    }
  };

  const handleRenameColumns = () => {
    if (!renameColumnsFile || Object.keys(columnRenames).length === 0) {
      toast.error("Please select a file and rename at least one column");
      return;
    }

    setIsProcessing(true);

    try {
      const fileToModify = files.find(file => file.id === renameColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      // Rename columns in the dataset
      const renamedData = renameColumns(fileToModify.data, columnRenames);

      // Update column names in the file metadata
      const updatedColumns = fileToModify.columns.map(col => 
        columnRenames[col] ? columnRenames[col] : col
      );

      // Update the file in our file list
      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === renameColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: renamedData,
          columns: updatedColumns
        };
        
        // Update with renamed columns and updated files
        onMergeComplete(renamedData, updatedFiles);
        toast.success(`Successfully renamed ${Object.keys(columnRenames).length} columns`);
      }
    } catch (error) {
      console.error("Error renaming columns:", error);
      toast.error("Failed to rename columns");
    } finally {
      setIsProcessing(false);
      setColumnRenames({}); // Reset for next operation
    }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      toast.error("Please select at least two files to merge");
      return;
    }

    // Validate that each file has at least one key column
    const invalidFiles = selectedFiles.filter(file => 
      !keyColumns[file.id] || keyColumns[file.id].length === 0
    );

    if (invalidFiles.length > 0) {
      toast.error(`Please select at least one key column for each file`);
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare datasets for merging
      const datasets: Record<string, any[]> = {};
      selectedFiles.forEach(file => {
        if (file.data) {
          datasets[file.id] = file.data;
        }
      });

      // Merge the datasets using the updated mergeDatasets function
      const mergedData = mergeDatasets(datasets, keyColumns, includeColumns);
      onMergeComplete(mergedData);
    } catch (error) {
      console.error("Error merging datasets:", error);
      toast.error("Failed to merge datasets");
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedFiles.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg animate-fade-in">
        <MergeIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
        <h3 className="font-medium text-lg mb-1">Select Files to Process</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Please select at least one file from the list above to start configuring transformation options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Configure Data Transformation</h2>
        <p className="text-sm text-muted-foreground">
          Select options to merge, drop columns, filter rows, or rename columns
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button 
          variant={currentAction === "merge" ? "default" : "outline"} 
          size="sm"
          onClick={() => setCurrentAction("merge")}
        >
          <Layers className="mr-2 h-4 w-4" />
          Merge Data
        </Button>
        <Button 
          variant={currentAction === "dropColumns" ? "default" : "outline"} 
          size="sm"
          onClick={() => setCurrentAction("dropColumns")}
        >
          <ColumnsIcon className="mr-2 h-4 w-4" />
          Drop Columns
        </Button>
        <Button 
          variant={currentAction === "dropRows" ? "default" : "outline"} 
          size="sm"
          onClick={() => setCurrentAction("dropRows")}
        >
          <RowsIcon className="mr-2 h-4 w-4" />
          Filter Rows
        </Button>
        <Button 
          variant={currentAction === "renameColumns" ? "default" : "outline"} 
          size="sm"
          onClick={() => setCurrentAction("renameColumns")}
        >
          <Tag className="mr-2 h-4 w-4" />
          Rename Columns
        </Button>
      </div>

      {currentAction === "merge" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Merge Configuration</h3>
            <p className="text-xs text-muted-foreground mb-3">
              To merge files, select key columns that match records across files. You can add multiple key columns for more precise matching.
            </p>
          </div>
          
          {selectedFiles.map(file => (
            <div key={file.id} className="p-4 bg-card rounded-lg border">
              <div className="mb-3">
                <h3 className="font-medium text-sm">{file.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {file.columns.length} columns • {file.data?.length || 0} rows
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center">
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  Key Columns
                </h4>
                
                {(keyColumns[file.id] || []).map((column, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={column}
                      onValueChange={(value) => handleKeyColumnChange(file.id, index, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {file.columns.map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveKeyColumn(file.id, index)}
                      disabled={(keyColumns[file.id] || []).length <= 1}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddKeyColumn(file.id)}
                  disabled={keyColumns[file.id]?.length === file.columns.length}
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-3.5 w-3.5" />
                  Add Key Column
                </Button>
              </div>
              
              <div className="mt-4">
                <Tabs defaultValue="include" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="include" className="flex-1">Include Columns</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="include" className="mt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {file.columns.map(column => (
                        <div key={column} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${file.id}-${column}`}
                            checked={(includeColumns[file.id] || []).includes(column)}
                            onCheckedChange={() => handleToggleColumn(file.id, column)}
                          />
                          <label
                            htmlFor={`${file.id}-${column}`}
                            className="text-sm truncate cursor-pointer"
                          >
                            {column}
                          </label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-6">
            <Button
              onClick={handleMerge}
              disabled={selectedFiles.length < 2 || isProcessing}
              className="hover-scale"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Merging...
                </>
              ) : (
                <>
                  <Layers className="mr-2 h-4 w-4" />
                  Merge Selected Files
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {currentAction === "dropColumns" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Drop Columns Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Select a file and choose which columns to remove from it.
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="mb-4">
              <label className="text-sm font-medium">Select File</label>
              <Select
                value={dropColumnsFile || ""}
                onValueChange={(value) => {
                  setDropColumnsFile(value);
                  setColumnsToExclude([]);
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
            
            {dropColumnsFile && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  <Trash2 className="h-3.5 w-3.5 inline mr-1.5" />
                  Select Columns to Drop
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {selectedFiles
                    .find(f => f.id === dropColumnsFile)
                    ?.columns.map(column => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={`drop-${dropColumnsFile}-${column}`}
                          checked={columnsToExclude.includes(column)}
                          onCheckedChange={() => handleToggleExcludeColumn(column)}
                        />
                        <label
                          htmlFor={`drop-${dropColumnsFile}-${column}`}
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
              disabled={!dropColumnsFile || columnsToExclude.length === 0 || isProcessing}
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
      )}

      {currentAction === "dropRows" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Filter Rows Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Select a file, choose a column, and specify values to filter out rows.
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="mb-4">
              <label className="text-sm font-medium">Select File</label>
              <Select
                value={dropRowsFile || ""}
                onValueChange={(value) => {
                  setDropRowsFile(value);
                  setDropRowsColumn(null);
                  setDropRowsValues("");
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
            
            {dropRowsFile && (
              <>
                <div className="mb-4">
                  <label className="text-sm font-medium">Select Column to Filter On</label>
                  <Select
                    value={dropRowsColumn || ""}
                    onValueChange={setDropRowsColumn}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Choose a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFiles
                        .find(f => f.id === dropRowsFile)
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
                    value={dropRowsValues}
                    onChange={(e) => setDropRowsValues(e.target.value)}
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
              disabled={!dropRowsFile || !dropRowsColumn || !dropRowsValues.trim() || isProcessing}
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
      )}

      {currentAction === "renameColumns" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Rename Columns Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Select a file and rename columns by providing new names.
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="mb-4">
              <label className="text-sm font-medium">Select File</label>
              <Select
                value={renameColumnsFile || ""}
                onValueChange={(value) => {
                  setRenameColumnsFile(value);
                  setColumnRenames({});
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
            
            {renameColumnsFile && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  <Edit className="h-3.5 w-3.5 inline mr-1.5" />
                  Rename Columns
                </h4>
                <div className="space-y-2 mt-2">
                  {selectedFiles
                    .find(f => f.id === renameColumnsFile)
                    ?.columns.map(column => (
                      <div key={column} className="flex items-center gap-2">
                        <div className="w-1/3 text-sm truncate">{column}</div>
                        <span className="text-muted-foreground">→</span>
                        <Input
                          placeholder="New name"
                          value={columnRenames[column] || ""}
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
              disabled={!renameColumnsFile || Object.keys(columnRenames).length === 0 || isProcessing}
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
      )}
    </div>
  );
};

export default MergeConfigurator;

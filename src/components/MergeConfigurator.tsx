import React, { useState, useMemo } from "react";
import { 
  FileData, 
  MergeOptions, 
  mergeDatasets, 
  filterRows, 
  excludeColumns, 
  renameColumns,
  trimColumnValues,
  pivotData,
  ColumnInfo,
  JoinType,
  PivotConfig
} from "@/utils/fileUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
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
  Edit,
  Scissors,
  GitMerge,
  Save,
  Grid3X3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MergeConfiguratorProps {
  files: FileData[];
  onMergeComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

const MergeConfigurator: React.FC<MergeConfiguratorProps> = ({ files, onMergeComplete }) => {
  const [keyColumns, setKeyColumns] = useState<Record<string, string[]>>({});
  const [includeColumns, setIncludeColumns] = useState<Record<string, string[]>>({});
  const [joinType, setJoinType] = useState<JoinType>("inner");
  const [baseFileId, setBaseFileId] = useState<string | null>(null);
  const [dropColumnsFile, setDropColumnsFile] = useState<string | null>(null);
  const [columnsToExclude, setColumnsToExclude] = useState<string[]>([]);
  const [dropRowsFile, setDropRowsFile] = useState<string | null>(null);
  const [dropRowsColumn, setDropRowsColumn] = useState<string | null>(null);
  const [dropRowsValues, setDropRowsValues] = useState<string>("");
  const [renameColumnsFile, setRenameColumnsFile] = useState<string | null>(null);
  const [columnRenames, setColumnRenames] = useState<Record<string, string>>({});
  const [trimColumnsFile, setTrimColumnsFile] = useState<string | null>(null);
  const [columnsToTrim, setColumnsToTrim] = useState<string[]>([]);
  const [pivotFile, setPivotFile] = useState<string | null>(null);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rowFields: [],
    columnField: "",
    valueFields: [],
    aggregation: "sum"
  });
  const [saveMergedFile, setSaveMergedFile] = useState(true);
  const [mergedFileName, setMergedFileName] = useState("merged-data");
  const [currentAction, setCurrentAction] = useState<"merge" | "dropColumns" | "dropRows" | "renameColumns" | "trimColumns" | "pivot">("merge");
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedFiles = useMemo(() => files.filter(file => file.selected), [files]);

  React.useEffect(() => {
    const newKeyColumns: Record<string, string[]> = {};
    const newIncludeColumns: Record<string, string[]> = {};

    selectedFiles.forEach(file => {
      if (!keyColumns[file.id] || keyColumns[file.id].length === 0) {
        newKeyColumns[file.id] = file.columns.length > 0 ? [file.columns[0]] : [];
      } else {
        newKeyColumns[file.id] = keyColumns[file.id];
      }

      if (!includeColumns[file.id]) {
        newIncludeColumns[file.id] = [...file.columns];
      } else {
        newIncludeColumns[file.id] = includeColumns[file.id];
      }
    });

    setKeyColumns(prev => ({ ...prev, ...newKeyColumns }));
    setIncludeColumns(prev => ({ ...prev, ...newIncludeColumns }));

    if (baseFileId && !selectedFiles.some(f => f.id === baseFileId)) {
      setBaseFileId(selectedFiles.length > 0 ? selectedFiles[0].id : null);
    }

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
    if (trimColumnsFile && !selectedFiles.some(f => f.id === trimColumnsFile)) {
      setTrimColumnsFile(null);
      setColumnsToTrim([]);
    }
    if (pivotFile && !selectedFiles.some(f => f.id === pivotFile)) {
      setPivotFile(null);
      setPivotConfig({
        rowFields: [],
        columnField: "",
        valueFields: [],
        aggregation: "sum"
      });
    }
  }, [selectedFiles]);

  const handleAddKeyColumn = (fileId: string) => {
    const file = selectedFiles.find(f => f.id === fileId);
    if (!file) return;

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

  const handleToggleTrimColumn = (column: string) => {
    setColumnsToTrim(prev => 
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

      const modifiedData = fileToModify.data.map(row => {
        const newRow = { ...row };
        columnsToExclude.forEach(column => {
          delete newRow[column];
        });
        return newRow;
      });

      const remainingColumns = fileToModify.columns.filter(col => !columnsToExclude.includes(col));

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === dropColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: modifiedData,
          columns: remainingColumns
        };
        
        onMergeComplete(modifiedData, updatedFiles);
        toast.success(`Successfully dropped ${columnsToExclude.length} columns`);
      }
    } catch (error) {
      console.error("Error dropping columns:", error);
      toast.error("Failed to drop columns");
    } finally {
      setIsProcessing(false);
      setColumnsToExclude([]);
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

      const valuesToDrop = dropRowsValues
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const filteredData = fileToModify.data.filter(row => {
        const columnValue = String(row[dropRowsColumn]).trim();
        return !valuesToDrop.includes(columnValue);
      });

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === dropRowsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: filteredData
        };
        
        onMergeComplete(filteredData, updatedFiles);
        toast.success(`Successfully filtered out ${fileToModify.data.length - filteredData.length} rows`);
      }
    } catch (error) {
      console.error("Error dropping rows:", error);
      toast.error("Failed to drop rows");
    } finally {
      setIsProcessing(false);
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

      const renamedData = renameColumns(fileToModify.data, columnRenames);

      const updatedColumns = fileToModify.columns.map(col => 
        columnRenames[col] ? columnRenames[col] : col
      );

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === renameColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: renamedData,
          columns: updatedColumns
        };
        
        onMergeComplete(renamedData, updatedFiles);
        toast.success(`Successfully renamed ${Object.keys(columnRenames).length} columns`);
      }
    } catch (error) {
      console.error("Error renaming columns:", error);
      toast.error("Failed to rename columns");
    } finally {
      setIsProcessing(false);
      setColumnRenames({});
    }
  };

  const handleTrimColumns = () => {
    if (!trimColumnsFile || columnsToTrim.length === 0) {
      toast.error("Please select a file and columns to trim");
      return;
    }

    setIsProcessing(true);

    try {
      const fileToModify = files.find(file => file.id === trimColumnsFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const trimmedData = trimColumnValues(fileToModify.data, columnsToTrim);

      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === trimColumnsFile);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToModify,
          data: trimmedData
        };
        
        onMergeComplete(trimmedData, updatedFiles);
        toast.success(`Successfully trimmed values in ${columnsToTrim.length} columns`);
      }
    } catch (error) {
      console.error("Error trimming columns:", error);
      toast.error("Failed to trim column values");
    } finally {
      setIsProcessing(false);
      setColumnsToTrim([]);
    }
  };

  const handlePivotData = () => {
    if (!pivotFile || !pivotConfig.columnField || pivotConfig.valueFields.length === 0 || pivotConfig.rowFields.length === 0) {
      toast.error("Please complete pivot configuration");
      return;
    }

    setIsProcessing(true);

    try {
      const fileToModify = files.find(file => file.id === pivotFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const pivotedData = pivotData(fileToModify.data, pivotConfig);
      
      if (pivotedData.length === 0) {
        toast.warning("No data after pivot operation");
        setIsProcessing(false);
        return;
      }

      const pivotColumns = Object.keys(pivotedData[0]);

      const pivotedFile: FileData = {
        id: `pivot-${Date.now()}`,
        name: `${fileToModify.name}-pivoted`,
        type: "text/csv",
        size: 0,
        content: "",
        data: pivotedData,
        columns: pivotColumns,
        selected: true
      };

      onMergeComplete(pivotedData, [...files, pivotedFile]);
      toast.success(`Successfully pivoted data with ${pivotedData.length} rows`);
    } catch (error) {
      console.error("Error pivoting data:", error);
      toast.error("Failed to pivot data");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      toast.error("Please select at least two files to merge");
      return;
    }

    const invalidFiles = selectedFiles.filter(file => 
      !keyColumns[file.id] || keyColumns[file.id].length === 0
    );

    if (invalidFiles.length > 0) {
      toast.error(`Please select at least one key column for each file`);
      return;
    }

    if (joinType === "left" && (!baseFileId || !selectedFiles.some(f => f.id === baseFileId))) {
      setBaseFileId(selectedFiles[0].id);
    }

    setIsProcessing(true);

    try {
      const datasets: Record<string, any[]> = {};
      selectedFiles.forEach(file => {
        if (file.data) {
          datasets[file.id] = file.data;
        }
      });

      console.log("Merging datasets with key columns:", keyColumns);
      console.log("Include columns:", includeColumns);
      console.log("Join type:", joinType);
      console.log("Base file for left join:", baseFileId);
      console.log("Datasets:", datasets);

      const mergedData = mergeDatasets(datasets, keyColumns, includeColumns, joinType, baseFileId || undefined);
      console.log("Merged data result:", mergedData);
      
      if (mergedData.length === 0) {
        toast.warning("No matching records found between datasets");
      } else {
        toast.success(`Successfully merged ${mergedData.length} records using ${joinType} join`);
      }
      
      if (saveMergedFile && mergedData.length > 0) {
        const mergedColumns = Object.keys(mergedData[0]);
        const mergedFile: FileData = {
          id: `merged-${Date.now()}`,
          name: `${mergedFileName}.csv`,
          type: "text/csv",
          size: new Blob([JSON.stringify(mergedData)]).size,
          content: "",
          data: mergedData,
          columns: mergedColumns,
          selected: false
        };
        
        onMergeComplete(mergedData, [...files, mergedFile], true);
      } else {
        onMergeComplete(mergedData);
      }
    } catch (error) {
      console.error("Error merging datasets:", error);
      toast.error("Failed to merge datasets");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePivotRowFieldChange = (index: number, value: string) => {
    setPivotConfig(prev => {
      const newRowFields = [...prev.rowFields];
      newRowFields[index] = value;
      return { ...prev, rowFields: newRowFields };
    });
  };

  const handleRemovePivotRowField = (index: number) => {
    setPivotConfig(prev => {
      const newRowFields = [...prev.rowFields];
      newRowFields.splice(index, 1);
      return { ...prev, rowFields: newRowFields };
    });
  };

  const handleAddPivotRowField = () => {
    if (!pivotFile) return;
    
    const file = selectedFiles.find(f => f.id === pivotFile);
    if (!file) return;
    
    const availableColumns = file.columns.filter(col => 
      !pivotConfig.rowFields.includes(col) && 
      col !== pivotConfig.columnField && 
      !pivotConfig.valueFields.includes(col)
    );
    
    if (availableColumns.length > 0) {
      setPivotConfig(prev => ({
        ...prev,
        rowFields: [...prev.rowFields, availableColumns[0]]
      }));
    }
  };

  const handleValueFieldsChange = (values: string[]) => {
    setPivotConfig(prev => ({
      ...prev,
      valueFields: values
    }));
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
          Select options to merge, drop columns, filter rows, rename columns, trim values, or create pivot tables
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
        <Button 
          variant={currentAction === "trimColumns" ? "default" : "outline"} 
          size="sm"
          onClick={() => setCurrentAction("trimColumns")}
        >
          <Scissors className="mr-2 h-4 w-4" />
          Trim Values
        </Button>
        <Button 
          variant={currentAction === "pivot" ? "default" : "outline"} 
          size="sm"
          onClick={() => setCurrentAction("pivot")}
        >
          <Grid3X3 className="mr-2 h-4 w-4" />
          Pivot Table
        </Button>
      </div>

      {currentAction === "merge" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Merge Configuration</h3>
            <p className="text-xs text-muted-foreground mb-3">
              To merge files, select key columns that match records across files and choose a join type.
            </p>
            
            <div className="mt-3">
              <label className="text-sm font-medium">Join Type</label>
              <div className="flex items-center mt-1">
                <Select
                  value={joinType}
                  onValueChange={(value: JoinType) => {
                    setJoinType(value);
                    if (value !== "left") {
                      setBaseFileId(null);
                    } else if (selectedFiles.length > 0) {
                      setBaseFileId(selectedFiles[0].id);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select join type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inner">
                      <div className="flex items-center">
                        <GitMerge className="h-4 w-4 mr-2" />
                        <span>Inner Join</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="left">
                      <div className="flex items-center">
                        <GitMerge className="h-4 w-4 mr-2" />
                        <span>Left Join</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="full">
                      <div className="flex items-center">
                        <GitMerge className="h-4 w-4 mr-2" />
                        <span>Full Join</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="ml-4 text-xs text-muted-foreground">
                  {joinType === "inner" && "Only include rows with matching keys in all files"}
                  {joinType === "left" && "Include all rows from the base file, matching rows from others"}
                  {joinType === "full" && "Include all rows from all files, with null values for missing matches"}
                </div>
              </div>
            </div>

            {joinType === "left" && (
              <div className="mt-3">
                <label className="text-sm font-medium">Base File (Left side of join)</label>
                <div className="flex items-center mt-1">
                  <Select
                    value={baseFileId || ""}
                    onValueChange={(value) => setBaseFileId(value)}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select base file for left join" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFiles.map(file => (
                        <SelectItem key={file.id} value={file.id}>
                          {file.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="ml-4 text-xs text-muted-foreground">
                    All rows from this file will be included in the result
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center space-x-2">
              <Checkbox
                id="save-merged"
                checked={saveMergedFile}
                onCheckedChange={(checked) => setSaveMergedFile(checked as boolean)}
              />
              <div>
                <label
                  htmlFor="save-merged"
                  className="text-sm font-medium cursor-pointer"
                >
                  Save merged result as file
                </label>
                <p className="text-xs text-muted-foreground">
                  Makes the merged result available for further merges
                </p>
              </div>
            </div>

            {saveMergedFile && (
              <div className="mt-2">
                <label className="text-sm font-medium">Merged File Name</label>
                <div className="flex items-center mt-1">
                  <Input
                    value={mergedFileName}
                    onChange={(e) => setMergedFileName(e.target.value)}
                    placeholder="Enter merged file name"
                    className="w-[280px]"
                  />
                  <span className="ml-2 text-muted-foreground">.csv</span>
                </div>
              </div>
            )}
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

      {currentAction === "pivot" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Pivot Table Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Create a pivot table by selecting row fields (index), column field, value fields, and aggregation type.
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="mb-4">
              <label className="text-sm font-medium">Select File</label>
              <Select
                value={pivotFile || ""}
                onValueChange={(value) => {
                  setPivotFile(value);
                  setPivotConfig({
                    rowFields: [],
                    columnField: "",
                    valueFields: [],
                    aggregation: "sum"
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
            
            {pivotFile && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Row Fields (Index)</h4>
                  {pivotConfig.rowFields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <Select
                        value={field}
                        onValueChange={(value) => handlePivotRowFieldChange(index, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a field" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFiles
                            .find(f => f.id === pivotFile)
                            ?.columns.filter(col => 
                              (col === field || 
                              (!pivotConfig.rowFields.includes(col) || pivotConfig.rowFields.indexOf(col) === index) && 
                              col !== pivotConfig.columnField && 
                              !pivotConfig.valueFields.includes(col))
                            )
                            .map(col => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemovePivotRowField(index)}
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddPivotRowField}
                    disabled={
                      !pivotFile || 
                      pivotConfig.rowFields.length >= 
                        (selectedFiles.find(f => f.id === pivotFile)?.columns.length || 0) - 2
                    }
                  >
                    <PlusCircle className="mr-2 h-3.5 w-3.5" />
                    Add Row Field
                  </Button>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Column Field</h4>
                  <Select
                    value={pivotConfig.columnField}
                    onValueChange={(value) => setPivotConfig(prev => ({ ...prev, columnField: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column field" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFiles
                        .find(f => f.id === pivotFile)
                        ?.columns.filter(col => 
                          !pivotConfig.rowFields.includes(col) && !pivotConfig.valueFields.includes(col)
                        )
                        .map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Value Fields</h4>
                  {selectedFiles.find(f => f.id === pivotFile)?.columns && (
                    <MultiSelect
                      options={selectedFiles
                        .find(f => f.id === pivotFile)
                        ?.columns.filter(col => 
                          !pivotConfig.rowFields.includes(col) && col !== pivotConfig.columnField
                        )
                        .map(col => ({ label: col, value: col })) || []
                      }
                      selected={pivotConfig.valueFields}
                      onChange={handleValueFieldsChange}
                      placeholder="Select value fields"
                      className="w-full"
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Select multiple fields to calculate values for each cell in the pivot table
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Aggregation Type</h4>
                  <Select
                    value={pivotConfig.aggregation}
                    onValueChange={(value: "sum" | "count" | "average" | "min" | "max") => 
                      setPivotConfig(prev => ({ ...prev, aggregation: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select aggregation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pivotConfig.rowFields.length > 0 && (
                  <div className="bg-muted/30 p-3 rounded-md mt-4">
                    <h4 className="text-sm font-medium mb-2">Pivot Table Preview</h4>
                    <div className="text-xs">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="font-medium">Index (Row Fields):</div>
                        <div>{pivotConfig.rowFields.join(", ")}</div>
                        
                        <div className="font-medium">Column Field:</div>
                        <div>{pivotConfig.columnField || "Not selected"}</div>
                        
                        <div className="font-medium">Value Fields:</div>
                        <div>{pivotConfig.valueFields.length > 0 ? pivotConfig.valueFields.join(", ") : "Not selected"}</div>
                        
                        <div className="font-medium">Aggregation:</div>
                        <div className="capitalize">{pivotConfig.aggregation}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center mt-6">
            <Button
              onClick={handlePivotData}
              disabled={
                !pivotFile || 
                !pivotConfig.columnField || 
                pivotConfig.valueFields.length === 0 || 
                pivotConfig.rowFields.length === 0 ||
                isProcessing
              }
              className="hover-scale"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating Pivot Table...
                </>
              ) : (
                <>
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Create Pivot Table
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

      {currentAction === "trimColumns" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium mb-2">Trim Values Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Select a file and choose which columns to trim whitespace from (leading and trailing spaces).
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="mb-4">
              <label className="text-sm font-medium">Select File</label>
              <Select
                value={trimColumnsFile || ""}
                onValueChange={(value) => {
                  setTrimColumnsFile(value);
                  setColumnsToTrim([]);
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
            
            {trimColumnsFile && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  <Scissors className="h-3.5 w-3.5 inline mr-1.5" />
                  Select Columns to Trim
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {selectedFiles
                    .find(f => f.id === trimColumnsFile)
                    ?.columns.map(column => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={`trim-${trimColumnsFile}-${column}`}
                          checked={columnsToTrim.includes(column)}
                          onCheckedChange={() => handleToggleTrimColumn(column)}
                        />
                        <label
                          htmlFor={`trim-${trimColumnsFile}-${column}`}
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
              disabled={!trimColumnsFile || columnsToTrim.length === 0 || isProcessing}
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
      )}
    </div>
  );
};

export default MergeConfigurator;

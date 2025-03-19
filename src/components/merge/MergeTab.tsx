
import React from "react";
import { Layers, GitMerge, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import ConfigHeader from "./ConfigHeader";
import FileCard from "./FileCard";
import { ActionTabProps, MergeTabState, AggregationType } from "./types";
import { JoinType, mergeDatasets } from "@/utils/fileUtils";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const MergeTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<MergeTabState>({
    keyColumns: {},
    includeColumns: {},
    joinType: "inner",
    baseFileId: null,
    saveMergedFile: true,
    mergedFileName: "merged-data",
    aggregationStrategy: "first"
  });

  React.useEffect(() => {
    const newKeyColumns: Record<string, string[]> = {};
    const newIncludeColumns: Record<string, string[]> = {};

    selectedFiles.forEach(file => {
      if (!state.keyColumns[file.id] || state.keyColumns[file.id].length === 0) {
        newKeyColumns[file.id] = file.columns.length > 0 ? [file.columns[0]] : [];
      } else {
        newKeyColumns[file.id] = state.keyColumns[file.id];
      }

      if (!state.includeColumns[file.id]) {
        newIncludeColumns[file.id] = [...file.columns];
      } else {
        newIncludeColumns[file.id] = state.includeColumns[file.id];
      }
    });

    setState(prev => ({
      ...prev,
      keyColumns: { ...prev.keyColumns, ...newKeyColumns },
      includeColumns: { ...prev.includeColumns, ...newIncludeColumns },
      baseFileId: prev.baseFileId && selectedFiles.some(f => f.id === prev.baseFileId) 
        ? prev.baseFileId 
        : selectedFiles.length > 0 ? selectedFiles[0].id : null
    }));
  }, [selectedFiles]);

  const handleAddKeyColumn = (fileId: string) => {
    const file = selectedFiles.find(f => f.id === fileId);
    if (!file) return;

    const availableColumns = file.columns.filter(col => 
      !(state.keyColumns[fileId] || []).includes(col)
    );
    
    if (availableColumns.length > 0) {
      setState(prev => ({
        ...prev,
        keyColumns: {
          ...prev.keyColumns,
          [fileId]: [...(prev.keyColumns[fileId] || []), availableColumns[0]]
        }
      }));
    }
  };

  const handleRemoveKeyColumn = (fileId: string, columnIndex: number) => {
    setState(prev => {
      const updatedColumns = [...(prev.keyColumns[fileId] || [])];
      updatedColumns.splice(columnIndex, 1);
      return { 
        ...prev, 
        keyColumns: { ...prev.keyColumns, [fileId]: updatedColumns }
      };
    });
  };

  const handleKeyColumnChange = (fileId: string, columnIndex: number, value: string) => {
    setState(prev => {
      const updatedColumns = [...(prev.keyColumns[fileId] || [])];
      updatedColumns[columnIndex] = value;
      return { 
        ...prev, 
        keyColumns: { ...prev.keyColumns, [fileId]: updatedColumns }
      };
    });
  };

  const handleToggleColumn = (fileId: string, column: string) => {
    setState(prev => {
      const currentColumns = prev.includeColumns[fileId] || [];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter(col => col !== column)
        : [...currentColumns, column];
      return { 
        ...prev, 
        includeColumns: { ...prev.includeColumns, [fileId]: newColumns }
      };
    });
  };

  const handleJoinTypeChange = (value: JoinType) => {
    setState(prev => ({ 
      ...prev, 
      joinType: value,
      baseFileId: value !== "left" 
        ? null 
        : (selectedFiles.length > 0 ? selectedFiles[0].id : null)
    }));
  };

  const handleAggregationStrategyChange = (value: AggregationType) => {
    setState(prev => ({ ...prev, aggregationStrategy: value }));
  };

  const handleSaveMergedChange = (checked: boolean) => {
    setState(prev => ({ ...prev, saveMergedFile: checked }));
  };

  const handleMergedFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, mergedFileName: e.target.value }));
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      toast.error("Please select at least two files to merge");
      return;
    }

    const invalidFiles = selectedFiles.filter(file => 
      !state.keyColumns[file.id] || state.keyColumns[file.id].length === 0
    );

    if (invalidFiles.length > 0) {
      toast.error(`Please select at least one key column for each file`);
      return;
    }

    try {
      const datasets: Record<string, any[]> = {};
      selectedFiles.forEach(file => {
        if (file.data) {
          datasets[file.id] = file.data;
        }
      });

      console.log("Merging datasets with key columns:", state.keyColumns);
      console.log("Include columns:", state.includeColumns);
      console.log("Join type:", state.joinType);
      console.log("Base file for left join:", state.baseFileId);
      console.log("Aggregation strategy:", state.aggregationStrategy);
      console.log("Datasets:", datasets);

      // We'd need to update the mergeDatasets function to handle aggregation
      // This is a mock implementation - in a real app, you would need to modify the fileUtils.ts
      const mergedData = mergeDatasets(
        datasets, 
        state.keyColumns, 
        state.includeColumns, 
        state.joinType, 
        state.baseFileId || undefined,
        state.aggregationStrategy
      );
      
      console.log("Merged data result:", mergedData);
      
      if (mergedData.length === 0) {
        toast.warning("No matching records found between datasets");
      } else {
        toast.success(`Successfully merged ${mergedData.length} records using ${state.joinType} join with ${state.aggregationStrategy} aggregation`);
      }
      
      if (state.saveMergedFile && mergedData.length > 0) {
        const mergedColumns = Object.keys(mergedData[0]);
        const mergedFile = {
          id: `merged-${Date.now()}`,
          name: `${state.mergedFileName}.csv`,
          type: "text/csv",
          size: new Blob([JSON.stringify(mergedData)]).size,
          content: "",
          data: mergedData,
          columns: mergedColumns,
          selected: false
        };
        
        onComplete(mergedData, [...files, mergedFile], true);
      } else {
        onComplete(mergedData);
      }
    } catch (error) {
      console.error("Error merging datasets:", error);
      toast.error("Failed to merge datasets");
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Merge Configuration" 
        description="To merge files, select key columns that match records across files and choose a join type."
      />
      
      <div className="bg-muted/40 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Join Type</label>
            <div className="flex items-center mt-1">
              <Select
                value={state.joinType}
                onValueChange={handleJoinTypeChange}
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
                {state.joinType === "inner" && "Only include rows with matching keys in all files"}
                {state.joinType === "left" && "Include all rows from the base file, matching rows from others"}
                {state.joinType === "full" && "Include all rows from all files, with null values for missing matches"}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Aggregation Strategy</label>
            <div className="flex items-center mt-1">
              <Select
                value={state.aggregationStrategy}
                onValueChange={handleAggregationStrategyChange}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select aggregation strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>First Match (Default)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="commaSeparated">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>Comma Separated Values</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sum">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>Sum (Numeric Fields)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="avg">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>Average (Numeric Fields)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="min">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>Minimum Value</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="max">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>Maximum Value</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="count">
                    <div className="flex items-center">
                      <Sigma className="h-4 w-4 mr-2" />
                      <span>Count</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="ml-4 text-xs text-muted-foreground">
                {state.aggregationStrategy === "first" && "Use first matching value only (default)"}
                {state.aggregationStrategy === "commaSeparated" && "Combine all matching values with commas"}
                {state.aggregationStrategy === "sum" && "Sum all numeric values"}
                {state.aggregationStrategy === "avg" && "Average all numeric values"}
                {state.aggregationStrategy === "min" && "Use minimum value"}
                {state.aggregationStrategy === "max" && "Use maximum value"}
                {state.aggregationStrategy === "count" && "Count number of matches"}
              </div>
            </div>
          </div>
        </div>

        {state.joinType === "left" && (
          <div className="mt-3">
            <label className="text-sm font-medium">Base File (Left side of join)</label>
            <div className="flex items-center mt-1">
              <Select
                value={state.baseFileId || ""}
                onValueChange={(value) => setState(prev => ({ ...prev, baseFileId: value }))}
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
            checked={state.saveMergedFile}
            onCheckedChange={(checked) => handleSaveMergedChange(checked as boolean)}
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

        {state.saveMergedFile && (
          <div className="mt-2">
            <label className="text-sm font-medium">Merged File Name</label>
            <div className="flex items-center mt-1">
              <Input
                value={state.mergedFileName}
                onChange={handleMergedFileNameChange}
                placeholder="Enter merged file name"
                className="w-[280px]"
              />
              <span className="ml-2 text-muted-foreground">.csv</span>
            </div>
          </div>
        )}
      </div>
      
      {selectedFiles.map(file => (
        <FileCard
          key={file.id}
          file={file}
          keyColumns={state.keyColumns[file.id] || []}
          includeColumns={state.includeColumns[file.id] || []}
          onAddKeyColumn={() => handleAddKeyColumn(file.id)}
          onRemoveKeyColumn={(index) => handleRemoveKeyColumn(file.id, index)}
          onKeyColumnChange={(index, value) => handleKeyColumnChange(file.id, index, value)}
          onToggleColumn={(column) => handleToggleColumn(file.id, column)}
        />
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
  );
};

export default MergeTab;

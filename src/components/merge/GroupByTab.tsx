
import React, { useState, useEffect } from "react";
import { FileData } from "@/utils/fileUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { GroupIcon, Database } from "lucide-react";
import { toast } from "sonner";
import ConfigHeader from "./ConfigHeader";
import { detectColumnTypes } from "@/utils/fileUtils";

interface GroupByTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

interface AggregationConfig {
  column: string;
  operation: string;
  newColumnName: string;
}

const GroupByTab: React.FC<GroupByTabProps> = ({
  files,
  selectedFiles,
  isProcessing,
  onComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [groupByColumns, setGroupByColumns] = useState<string[]>([]);
  const [aggregations, setAggregations] = useState<AggregationConfig[]>([{
    column: "",
    operation: "sum",
    newColumnName: ""
  }]);
  const [whereClause, setWhereClause] = useState("");
  const [orderByColumn, setOrderByColumn] = useState("");
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(0);
  const [saveAsFile, setSaveAsFile] = useState(true);
  const [columnTypes, setColumnTypes] = useState<{[key: string]: string}>({});

  // Initialize with first selected file
  useEffect(() => {
    if (selectedFiles.length > 0) {
      setSelectedFile(selectedFiles[0]);
      
      if (selectedFiles[0].data && selectedFiles[0].data.length > 0) {
        const types = detectColumnTypes(selectedFiles[0].data);
        const columnTypeMap: {[key: string]: string} = {};
        Object.keys(types).forEach(col => {
          columnTypeMap[col] = types[col].type;
        });
        setColumnTypes(columnTypeMap);
      }
    }
  }, [selectedFiles]);

  const handleGroupByColumnToggle = (column: string) => {
    setGroupByColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        return [...prev, column];
      }
    });
  };

  const handleAggregationChange = (index: number, field: keyof AggregationConfig, value: string) => {
    setAggregations(prev => {
      const newAggregations = [...prev];
      newAggregations[index] = {
        ...newAggregations[index],
        [field]: value
      };
      
      // Auto-generate new column name if empty
      if ((field === 'column' || field === 'operation') && !newAggregations[index].newColumnName) {
        const column = field === 'column' ? value : newAggregations[index].column;
        const operation = field === 'operation' ? value : newAggregations[index].operation;
        if (column && operation) {
          newAggregations[index].newColumnName = `${operation}_${column}`;
        }
      }
      
      return newAggregations;
    });
  };

  const addAggregation = () => {
    setAggregations(prev => [
      ...prev,
      {
        column: "",
        operation: "sum",
        newColumnName: ""
      }
    ]);
  };

  const removeAggregation = (index: number) => {
    setAggregations(prev => prev.filter((_, i) => i !== index));
  };

  const evaluateWhereClause = (row: any, clause: string): boolean => {
    if (!clause.trim()) return true;
    
    try {
      let condition = clause;
      
      // Replace column references with actual values
      Object.keys(row).forEach(column => {
        const regex = new RegExp(`\\b${column}\\b`, 'g');
        const value = typeof row[column] === 'string' 
          ? `"${row[column]}"` 
          : row[column];
        condition = condition.replace(regex, value);
      });
      
      // Handle SQL operators
      condition = condition.replace(/=/g, '===');
      condition = condition.replace(/<>/g, '!==');
      condition = condition.replace(/AND/gi, '&&');
      condition = condition.replace(/OR/gi, '||');
      condition = condition.replace(/NULL/gi, 'null');
      
      return Function(`return ${condition}`)();
    } catch (error) {
      console.error("Error evaluating WHERE clause:", error);
      return true;
    }
  };

  const performGroupBy = () => {
    if (!selectedFile || !selectedFile.data) {
      toast.error("No file data available");
      return;
    }

    if (groupByColumns.length === 0) {
      toast.error("Please select at least one column to group by");
      return;
    }

    if (aggregations.some(agg => !agg.column || !agg.operation || !agg.newColumnName)) {
      toast.error("Please fill in all aggregation fields");
      return;
    }

    try {
      // Apply WHERE clause
      const filteredData = whereClause
        ? selectedFile.data.filter(row => evaluateWhereClause(row, whereClause))
        : selectedFile.data;
      
      // Group data
      const groups: {[key: string]: any[]} = {};
      
      filteredData.forEach(row => {
        const groupKey = groupByColumns.map(col => String(row[col] || '')).join('|');
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(row);
      });
      
      // Apply aggregations
      let result = Object.entries(groups).map(([key, rows]) => {
        const newRow: {[key: string]: any} = {};
        
        // Add group columns
        const keyParts = key.split('|');
        groupByColumns.forEach((col, index) => {
          newRow[col] = keyParts[index];
        });
        
        // Calculate aggregations
        aggregations.forEach(agg => {
          const values = rows.map(row => {
            const val = row[agg.column];
            return isNaN(Number(val)) ? null : Number(val);
          }).filter(val => val !== null && val !== undefined);
          
          switch (agg.operation) {
            case 'sum':
              newRow[agg.newColumnName] = values.reduce((sum, val) => sum + (val || 0), 0);
              break;
            case 'avg':
              newRow[agg.newColumnName] = values.length ? values.reduce((sum, val) => sum + (val || 0), 0) / values.length : 0;
              break;
            case 'count':
              newRow[agg.newColumnName] = rows.length;
              break;
            case 'min':
              newRow[agg.newColumnName] = values.length ? Math.min(...values) : null;
              break;
            case 'max':
              newRow[agg.newColumnName] = values.length ? Math.max(...values) : null;
              break;
            default:
              newRow[agg.newColumnName] = values.reduce((sum, val) => sum + (val || 0), 0);
          }
        });
        
        return newRow;
      });
      
      // Apply ORDER BY
      if (orderByColumn && orderByColumn !== "none") {
        result.sort((a, b) => {
          const aVal = a[orderByColumn];
          const bVal = b[orderByColumn];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          const aStr = String(aVal || '');
          const bStr = String(bVal || '');
          return orderDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
      
      // Apply LIMIT
      if (limit > 0) {
        result = result.slice(0, limit);
      }
      
      if (saveAsFile) {
        const newFileName = `grouped_${selectedFile.name}`;
        const newFileId = `grouped-${Date.now()}`;
        const resultColumns = result.length > 0 ? Object.keys(result[0]) : [];
        
        const newFile: FileData = {
          id: newFileId,
          name: newFileName,
          type: "csv",
          size: 0,
          data: result,
          columns: resultColumns,
          selected: true,
          content: ''
        };
        
        const updatedFiles = [...files, newFile];
        onComplete(result, updatedFiles, true);
      } else {
        onComplete(result);
      }
      
      toast.success(`Successfully grouped data into ${result.length} rows`);
    } catch (error) {
      console.error("Error performing group by:", error);
      toast.error("Failed to group data");
    }
  };

  // Get numeric columns for aggregations
  const numericColumns = selectedFile?.columns.filter(col => 
    columnTypes[col] === 'integer' || columnTypes[col] === 'decimal'
  ) || [];

  return (
    <div className="space-y-6">
      <ConfigHeader
        title="SQL Group By"
        description="Group your data by columns and apply aggregations like SQL GROUP BY"
        icon={<Database className="h-5 w-5" />}
      />

      {selectedFiles.length > 1 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
          <p className="text-sm">Group By works on a single file. Only the first selected file will be used.</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>Select Data Source</Label>
          <Select
            value={selectedFile?.id || ""}
            onValueChange={(value) => {
              const file = files.find((f) => f.id === value);
              if (file) setSelectedFile(file);
            }}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select file" />
            </SelectTrigger>
            <SelectContent>
              {selectedFiles.map((file) => (
                <SelectItem key={file.id} value={file.id}>
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedFile && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-base font-medium">GROUP BY Columns</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select columns to group your data by
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedFile.columns.map((column) => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${column}`}
                      checked={groupByColumns.includes(column)}
                      onCheckedChange={() => handleGroupByColumnToggle(column)}
                      disabled={isProcessing}
                    />
                    <Label
                      htmlFor={`group-${column}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {column}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Aggregations (SELECT)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAggregation}
                  disabled={isProcessing || numericColumns.length === 0}
                >
                  Add Aggregation
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Define how to aggregate your data (SUM, AVG, COUNT, etc.)
              </p>

              {numericColumns.length === 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
                  <p className="text-sm">No numeric columns found in this file. Aggregations require numeric data.</p>
                </div>
              )}

              <div className="space-y-4">
                {aggregations.map((agg, index) => (
                  <div key={index} className="rounded-md border p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Aggregation {index + 1}</h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAggregation(index)}
                          disabled={isProcessing}
                          className="h-8 w-8 p-0"
                        >
                          &times;
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Numeric Column</Label>
                        <Select
                          value={agg.column}
                          onValueChange={(value) => handleAggregationChange(index, 'column', value)}
                          disabled={isProcessing || numericColumns.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {numericColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Aggregation Type</Label>
                        <Select
                          value={agg.operation}
                          onValueChange={(value) => handleAggregationChange(index, 'operation', value)}
                          disabled={isProcessing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">SUM</SelectItem>
                            <SelectItem value="avg">AVG</SelectItem>
                            <SelectItem value="min">MIN</SelectItem>
                            <SelectItem value="max">MAX</SelectItem>
                            <SelectItem value="count">COUNT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Result Column Name</Label>
                        <Input
                          value={agg.newColumnName}
                          onChange={(e) => handleAggregationChange(index, 'newColumnName', e.target.value)}
                          placeholder={agg.column && agg.operation ? `${agg.operation}_${agg.column}` : "Column name"}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <Label className="text-base font-medium">SQL Clauses</Label>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>WHERE Clause</Label>
                  <Input
                    value={whereClause}
                    onChange={(e) => setWhereClause(e.target.value)}
                    placeholder="e.g. column1 > 10 AND column2 = 'value'"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Filter rows before grouping (supports =, &gt;, &lt;, &lt;&gt;, AND, OR)
                  </p>
                </div>
                
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ORDER BY</Label>
                    <Select
                      value={orderByColumn}
                      onValueChange={setOrderByColumn}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column to sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {groupByColumns.map(column => (
                          <SelectItem key={column} value={column}>{column}</SelectItem>
                        ))}
                        {aggregations.map(agg => (
                          agg.newColumnName ? (
                            <SelectItem key={agg.newColumnName} value={agg.newColumnName}>
                              {agg.newColumnName}
                            </SelectItem>
                          ) : null
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {orderByColumn && orderByColumn !== "none" && (
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="order-asc"
                            checked={orderDirection === 'asc'}
                            onCheckedChange={(checked) => 
                              setOrderDirection(checked ? 'asc' : 'desc')
                            }
                          />
                          <Label htmlFor="order-asc" className="text-sm">Ascending</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="order-desc"
                            checked={orderDirection === 'desc'}
                            onCheckedChange={(checked) => 
                              setOrderDirection(checked ? 'desc' : 'asc')
                            }
                          />
                          <Label htmlFor="order-desc" className="text-sm">Descending</Label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>LIMIT</Label>
                    <Input
                      type="number"
                      min="0"
                      value={limit === 0 ? "" : limit}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseInt(e.target.value);
                        setLimit(value);
                      }}
                      placeholder="Limit number of results"
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no limit
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-as-file"
                  checked={saveAsFile}
                  onCheckedChange={(checked) => setSaveAsFile(!!checked)}
                  disabled={isProcessing}
                />
                <Label
                  htmlFor="save-as-file"
                  className="font-normal cursor-pointer"
                >
                  Save result as a new file
                </Label>
              </div>

              <Button
                type="button"
                onClick={performGroupBy}
                disabled={
                  isProcessing || 
                  groupByColumns.length === 0 || 
                  aggregations.some(agg => !agg.column || !agg.newColumnName) ||
                  numericColumns.length === 0
                }
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Execute Group By Query"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupByTab;

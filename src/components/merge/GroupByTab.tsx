import React, { useState, useEffect } from "react";
import { FileData } from "@/utils/fileUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowDownUp, Check, ChevronRight, Database, PieChart } from "lucide-react";
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

type GroupByConfig = {
  groupByColumns: string[];
  aggregations: AggregationConfig[];
  whereClause: string;
  orderByColumn: string;
  orderDirection: 'asc' | 'desc';
  limit: number;
}

const GroupByTab: React.FC<GroupByTabProps> = ({
  files,
  selectedFiles,
  isProcessing,
  onComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [config, setConfig] = useState<GroupByConfig>({
    groupByColumns: [],
    aggregations: [{
      column: "",
      operation: "sum",
      newColumnName: ""
    }],
    whereClause: "",
    orderByColumn: "",
    orderDirection: 'desc',
    limit: 0
  });
  const [columnTypes, setColumnTypes] = useState<{[key: string]: string}>({});
  const [saveAsMergedFile, setSaveAsMergedFile] = useState(true);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      setSelectedFile(selectedFiles[0]);

      if (selectedFiles[0].data && selectedFiles[0].data.length > 0) {
        const detectedTypes = detectColumnTypes(selectedFiles[0].data);
        const types: {[key: string]: string} = {};
        Object.keys(detectedTypes).forEach(col => {
          types[col] = detectedTypes[col].type;
        });
        setColumnTypes(types);
      }
    }
  }, [selectedFiles]);

  const handleGroupByChange = (column: string) => {
    setConfig(prev => {
      const newGroupByColumns = [...prev.groupByColumns];
      if (newGroupByColumns.includes(column)) {
        return {
          ...prev,
          groupByColumns: newGroupByColumns.filter(col => col !== column)
        };
      } else {
        return {
          ...prev,
          groupByColumns: [...newGroupByColumns, column]
        };
      }
    });
  };

  const handleAggregationChange = (index: number, field: keyof AggregationConfig, value: string) => {
    setConfig(prev => {
      const newAggregations = [...prev.aggregations];
      newAggregations[index] = {
        ...newAggregations[index],
        [field]: value
      };

      if ((field === 'column' || field === 'operation') && !newAggregations[index].newColumnName) {
        const column = field === 'column' ? value : newAggregations[index].column;
        const operation = field === 'operation' ? value : newAggregations[index].operation;
        if (column && operation) {
          newAggregations[index].newColumnName = `${operation}_${column}`;
        }
      }

      return {
        ...prev,
        aggregations: newAggregations
      };
    });
  };

  const addAggregation = () => {
    setConfig(prev => ({
      ...prev,
      aggregations: [
        ...prev.aggregations,
        {
          column: "",
          operation: "sum",
          newColumnName: ""
        }
      ]
    }));
  };

  const removeAggregation = (index: number) => {
    setConfig(prev => ({
      ...prev,
      aggregations: prev.aggregations.filter((_, i) => i !== index)
    }));
  };

  const evaluateWhereClause = (row: any, whereClause: string): boolean => {
    if (!whereClause.trim()) return true;
    
    try {
      let condition = whereClause;
      Object.keys(row).forEach(column => {
        const regex = new RegExp(`\\b${column}\\b`, 'g');
        const value = typeof row[column] === 'string' 
          ? `"${row[column]}"` 
          : row[column];
        condition = condition.replace(regex, value);
      });
      
      condition = condition.replace(/=/g, '===');
      condition = condition.replace(/<>/g, '!==');
      condition = condition.replace(/AND/gi, '&&');
      condition = condition.replace(/OR/gi, '||');
      condition = condition.replace(/NULL/gi, 'null');
      condition = condition.replace(/LIKE/gi, '.includes');
      
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

    if (config.groupByColumns.length === 0) {
      toast.error("Please select at least one column to group by");
      return;
    }

    if (config.aggregations.some(agg => !agg.column || !agg.operation || !agg.newColumnName)) {
      toast.error("Please fill in all aggregation fields");
      return;
    }

    const { data } = selectedFile;
    
    try {
      const filteredData = config.whereClause
        ? data.filter(row => evaluateWhereClause(row, config.whereClause))
        : data;
      
      const groupedData: {[key: string]: any[]} = {};
      
      filteredData.forEach(row => {
        const groupKey = config.groupByColumns.map(col => String(row[col] || '')).join('|');
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = [];
        }
        groupedData[groupKey].push(row);
      });
      
      let result = Object.entries(groupedData).map(([key, rows]) => {
        const newRow: {[key: string]: any} = {};
        
        const keyParts = key.split('|');
        config.groupByColumns.forEach((col, index) => {
          newRow[col] = keyParts[index];
        });
        
        config.aggregations.forEach(agg => {
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
        
        config.aggregations.forEach(agg => {
          const marketShareCol = `${agg.newColumnName}_share_pct`;
          const totalSum = Object.values(groupedData)
            .flatMap(rows => rows.map(row => isNaN(Number(row[agg.column])) ? 0 : Number(row[agg.column])))
            .reduce((sum, val) => sum + (val || 0), 0);
          
          if (totalSum > 0) {
            const groupSum = values => values.reduce((sum, val) => sum + (val || 0), 0);
            const rowSum = groupSum(rows.map(row => isNaN(Number(row[agg.column])) ? 0 : Number(row[agg.column])));
            newRow[marketShareCol] = (rowSum / totalSum) * 100;
          } else {
            newRow[marketShareCol] = 0;
          }
        });
        
        return newRow;
      });
      
      if (config.orderByColumn) {
        result.sort((a, b) => {
          const aVal = a[config.orderByColumn];
          const bVal = b[config.orderByColumn];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return config.orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          const aStr = String(aVal || '');
          const bStr = String(bVal || '');
          return config.orderDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
      
      if (config.limit > 0) {
        result = result.slice(0, config.limit);
      }

      if (saveAsMergedFile) {
        const newFileName = `grouped_${selectedFile.name}`;
        const newFileId = `grouped-${Date.now()}`;
        const resultColumns = Object.keys(result[0] || {});
        
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
      
      toast.success(`Successfully created ${result.length} groups`);
    } catch (error) {
      console.error("Error performing group by:", error);
      toast.error("Failed to process group by operation");
    }
  };

  const numericColumns = selectedFile?.columns.filter(col => 
    columnTypes[col] === 'integer' || columnTypes[col] === 'decimal'
  ) || [];

  return (
    <div className="space-y-6">
      <ConfigHeader
        title="SQL-like Group By"
        description="Group your data like SQL: SELECT columns, GROUP BY, aggregate functions, WHERE, ORDER BY, and LIMIT."
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
                      checked={config.groupByColumns.includes(column)}
                      onCheckedChange={() => handleGroupByChange(column)}
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
                {config.aggregations.map((agg, index) => (
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
                    value={config.whereClause}
                    onChange={(e) => setConfig(prev => ({ ...prev, whereClause: e.target.value }))}
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
                      value={config.orderByColumn}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, orderByColumn: value }))}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column to sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {config.groupByColumns.map(column => (
                          <SelectItem key={column} value={column}>{column}</SelectItem>
                        ))}
                        {config.aggregations.map(agg => (
                          <SelectItem key={agg.newColumnName} value={agg.newColumnName}>
                            {agg.newColumnName}
                          </SelectItem>
                        ))}
                        {config.aggregations.map(agg => (
                          <SelectItem key={`${agg.newColumnName}_share_pct`} value={`${agg.newColumnName}_share_pct`}>
                            {agg.newColumnName}_share_pct
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {config.orderByColumn && config.orderByColumn !== "none" && (
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="order-asc"
                            checked={config.orderDirection === 'asc'}
                            onCheckedChange={(checked) => 
                              setConfig(prev => ({ ...prev, orderDirection: checked ? 'asc' : 'desc' }))
                            }
                          />
                          <Label htmlFor="order-asc" className="text-sm">Ascending</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="order-desc"
                            checked={config.orderDirection === 'desc'}
                            onCheckedChange={(checked) => 
                              setConfig(prev => ({ ...prev, orderDirection: checked ? 'desc' : 'asc' }))
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
                      value={config.limit === 0 ? "" : config.limit}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseInt(e.target.value);
                        setConfig(prev => ({ ...prev, limit: value }));
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
                  checked={saveAsMergedFile}
                  onCheckedChange={(checked) => setSaveAsMergedFile(!!checked)}
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
                type="submit"
                onClick={performGroupBy}
                disabled={
                  isProcessing || 
                  config.groupByColumns.length === 0 || 
                  config.aggregations.some(agg => !agg.column || !agg.newColumnName) ||
                  numericColumns.length === 0
                }
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Execute Query"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupByTab;

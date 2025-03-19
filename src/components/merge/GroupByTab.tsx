import React, { useState, useEffect } from "react";
import { FileData } from "@/utils/fileUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowDownUp, Check, ChevronRight, Calculator, PieChart } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  isMarketShare: boolean;
  marketShareName: string;
}

type GroupByConfig = {
  groupByColumns: string[];
  aggregations: AggregationConfig[];
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
      newColumnName: "",
      isMarketShare: false,
      marketShareName: ""
    }]
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

  const handleAggregationChange = (index: number, field: keyof AggregationConfig, value: string | boolean) => {
    setConfig(prev => {
      const newAggregations = [...prev.aggregations];
      newAggregations[index] = {
        ...newAggregations[index],
        [field]: value
      };

      if (field === 'column' || field === 'operation') {
        if (!newAggregations[index].newColumnName) {
          const column = field === 'column' ? value as string : newAggregations[index].column;
          const operation = field === 'operation' ? value as string : newAggregations[index].operation;
          if (column && operation) {
            newAggregations[index].newColumnName = `${operation}_${column}`;
          }
        }
      }

      if (field === 'isMarketShare' && value === true) {
        if (!newAggregations[index].marketShareName) {
          newAggregations[index].marketShareName = `${newAggregations[index].newColumnName}_market_share`;
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
          newColumnName: "",
          isMarketShare: false,
          marketShareName: ""
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
      const groupedData: {[key: string]: any[]} = {};
      
      data.forEach(row => {
        const groupKey = config.groupByColumns.map(col => String(row[col] || '')).join('|');
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = [];
        }
        groupedData[groupKey].push(row);
      });
      
      const result = Object.entries(groupedData).map(([key, rows]) => {
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
        
        return newRow;
      });
      
      const totals: {[key: string]: number} = {};
      config.aggregations.forEach(agg => {
        if (agg.isMarketShare) {
          totals[agg.newColumnName] = result.reduce((sum, row) => sum + (Number(row[agg.newColumnName]) || 0), 0);
        }
      });
      
      result.forEach(row => {
        config.aggregations.forEach(agg => {
          if (agg.isMarketShare && totals[agg.newColumnName] > 0) {
            const value = Number(row[agg.newColumnName]) || 0;
            row[agg.marketShareName] = (value / totals[agg.newColumnName]) * 100;
          }
        });
      });

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
        title="Group & Market Share Analysis"
        description="Group your data by specific columns and calculate aggregations like sum, average, etc. and compute market share percentages."
        icon={<PieChart className="h-5 w-5" />}
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
              <Label className="text-base font-medium">Group By Columns</Label>
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
                <Label className="text-base font-medium">Aggregations</Label>
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
                Define how to aggregate your data and calculate market share
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
                    
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
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
                      
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`market-share-${index}`}
                            checked={agg.isMarketShare}
                            onCheckedChange={(checked) => handleAggregationChange(index, 'isMarketShare', !!checked)}
                            disabled={isProcessing || !agg.column}
                          />
                          <Label
                            htmlFor={`market-share-${index}`}
                            className="font-normal cursor-pointer"
                          >
                            Calculate Market Share %
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                  <Calculator className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">
                                  Market share will calculate each row's percentage of the total sum across all groups.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      {agg.isMarketShare && (
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Market Share Column Name</Label>
                          <Input
                            value={agg.marketShareName}
                            onChange={(e) => handleAggregationChange(index, 'marketShareName', e.target.value)}
                            placeholder={`${agg.newColumnName}_market_share`}
                            disabled={isProcessing}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
                {isProcessing ? "Processing..." : "Group Data & Calculate"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupByTab;

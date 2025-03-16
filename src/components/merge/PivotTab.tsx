
import React, { useState, useEffect } from "react";
import { Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps } from "./types";
import { pivotData } from "@/utils/fileUtils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PivotTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  // State
  const [pivotFile, setPivotFile] = useState<string | null>(null);
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnField, setColumnField] = useState<string>("");
  const [valueFields, setValueFields] = useState<string[]>([]);
  const [aggregation, setAggregation] = useState<"first" | "sum" | "count" | "average" | "min" | "max">("first");
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Update available columns when the selected file changes
  useEffect(() => {
    if (!pivotFile) {
      setAvailableColumns([]);
      return;
    }
    
    const file = selectedFiles.find(f => f.id === pivotFile);
    if (file) {
      setAvailableColumns(file.columns || []);
    }
  }, [pivotFile, selectedFiles]);

  // Reset fields when file changes
  useEffect(() => {
    setRowFields([]);
    setColumnField("");
    setValueFields([]);
  }, [pivotFile]);

  // Handle adding a row field
  const handleAddRowField = (field: string) => {
    if (rowFields.includes(field)) return;
    setRowFields(prev => [...prev, field]);
  };

  // Handle removing a row field
  const handleRemoveRowField = (field: string) => {
    setRowFields(prev => prev.filter(f => f !== field));
  };

  // Handle toggling a value field
  const handleToggleValueField = (field: string) => {
    setValueFields(prev => 
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  // Handle pivot operation
  const handlePivot = () => {
    if (!pivotFile || !columnField || valueFields.length === 0 || rowFields.length === 0) {
      toast.error("Please complete all required pivot configuration fields");
      return;
    }

    try {
      const sourceFile = files.find(file => file.id === pivotFile);
      if (!sourceFile || !sourceFile.data) {
        toast.error("Source file data not found");
        return;
      }

      const pivotConfig = {
        rowFields,
        columnField,
        valueFields,
        aggregation
      };

      const pivotedData = pivotData(sourceFile.data, pivotConfig);
      
      if (pivotedData.length === 0) {
        toast.warning("Pivot operation resulted in empty data");
        return;
      }

      const pivotColumns = Object.keys(pivotedData[0]);

      const pivotedFile = {
        id: `pivot-${Date.now()}`,
        name: `${sourceFile.name}-pivoted`,
        type: "text/csv",
        size: 0,
        content: "",
        data: pivotedData,
        columns: pivotColumns,
        selected: true
      };

      onComplete(pivotedData, [...files, pivotedFile]);
      toast.success(`Successfully created pivot table with ${pivotedData.length} rows`);
    } catch (error) {
      console.error("Error creating pivot table:", error);
      toast.error("Failed to create pivot table");
    }
  };

  // Filter functions for columns based on their current usage
  const getAvailableRowFields = () => {
    return availableColumns.filter(col => 
      col !== columnField && 
      !rowFields.includes(col)
    );
  };

  const getAvailableValueFields = () => {
    return availableColumns.filter(col => 
      !rowFields.includes(col)
    );
  };

  return (
    <div className="space-y-6">
      <ConfigHeader 
        title="Pivot Table" 
        description="Create a pivot table by selecting index fields (rows), column field, value fields, and aggregation method."
      />
      
      <div className="p-6 bg-card rounded-lg border">
        {/* File Selection */}
        <div className="mb-6">
          <h3 className="text-base font-medium mb-2">Step 1: Select File</h3>
          <Select
            value={pivotFile || ""}
            onValueChange={setPivotFile}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a file to pivot" />
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
          <>
            {/* Row Fields (Index) */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2">Step 2: Select Row Fields (Index)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Select one or more fields to use as row identifiers
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {rowFields.map(field => (
                  <div key={field} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
                    <span className="text-sm font-medium">{field}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveRowField(field)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              
              {getAvailableRowFields().length > 0 && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select onValueChange={handleAddRowField}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add row field" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableRowFields().map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const availableFields = getAvailableRowFields();
                      if (availableFields.length > 0) {
                        handleAddRowField(availableFields[0]);
                      }
                    }}
                    disabled={getAvailableRowFields().length === 0}
                  >
                    Add Field
                  </Button>
                </div>
              )}
            </div>
            
            {/* Column Field */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2">Step 3: Select Column Field</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Select the field that will be used to create columns in the pivot table
              </p>
              
              <Select
                value={columnField}
                onValueChange={setColumnField}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column field" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns
                    .filter(col => !rowFields.includes(col))
                    .map(col => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Value Fields */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2">Step 4: Select Value Fields</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Select fields to calculate values for each cell in the pivot table
              </p>
              
              <div className="space-y-3 max-h-48 overflow-y-auto p-2 border rounded-md">
                {getAvailableValueFields().map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`value-${field}`} 
                      checked={valueFields.includes(field)}
                      onCheckedChange={() => handleToggleValueField(field)}
                    />
                    <Label 
                      htmlFor={`value-${field}`}
                      className="cursor-pointer"
                    >
                      {field}
                    </Label>
                  </div>
                ))}
                {getAvailableValueFields().length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    No available fields
                  </p>
                )}
              </div>
              
              {valueFields.length > 0 && (
                <div className="mt-2 text-sm">
                  Selected: {valueFields.join(", ")}
                </div>
              )}
            </div>
            
            {/* Aggregation Method */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2">Step 5: Select Aggregation Method</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Choose how values should be aggregated when multiple values exist for the same cell
              </p>
              
              <Select
                value={aggregation}
                onValueChange={(value: "first" | "sum" | "count" | "average" | "min" | "max") => setAggregation(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select aggregation method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First Value</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Pivot Table Summary */}
            <div className="bg-muted/30 p-4 rounded-md">
              <h3 className="text-base font-medium mb-2">Pivot Table Configuration</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Row Fields:</div>
                <div>{rowFields.length > 0 ? rowFields.join(", ") : "None selected"}</div>
                
                <div className="font-medium">Column Field:</div>
                <div>{columnField || "None selected"}</div>
                
                <div className="font-medium">Value Fields:</div>
                <div>{valueFields.length > 0 ? valueFields.join(", ") : "None selected"}</div>
                
                <div className="font-medium">Aggregation:</div>
                <div className="capitalize">{aggregation}</div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Create Button */}
      <div className="flex justify-center">
        <Button
          onClick={handlePivot}
          disabled={
            !pivotFile || 
            rowFields.length === 0 || 
            !columnField || 
            valueFields.length === 0 ||
            isProcessing
          }
          className="w-full sm:w-auto"
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
  );
};

export default PivotTab;


import React from "react";
import { Grid3X3, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps, PivotTabState } from "./types";
import { pivotData, PivotConfig } from "@/utils/fileUtils";
import { toast } from "sonner";

const PivotTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = React.useState<PivotTabState>({
    pivotFile: null,
    pivotConfig: {
      rowFields: [],
      columnField: "",
      valueFields: [],
      aggregation: "sum"
    }
  });

  const handlePivotRowFieldChange = (index: number, value: string) => {
    setState(prev => {
      const newRowFields = [...prev.pivotConfig.rowFields];
      newRowFields[index] = value;
      return { 
        ...prev, 
        pivotConfig: { ...prev.pivotConfig, rowFields: newRowFields }
      };
    });
  };

  const handleRemovePivotRowField = (index: number) => {
    setState(prev => {
      const newRowFields = [...prev.pivotConfig.rowFields];
      newRowFields.splice(index, 1);
      return { 
        ...prev, 
        pivotConfig: { ...prev.pivotConfig, rowFields: newRowFields }
      };
    });
  };

  const handleAddPivotRowField = () => {
    if (!state.pivotFile) return;
    
    const file = selectedFiles.find(f => f.id === state.pivotFile);
    if (!file) return;
    
    const availableColumns = file.columns.filter(col => 
      !state.pivotConfig.rowFields.includes(col) && 
      col !== state.pivotConfig.columnField && 
      !state.pivotConfig.valueFields.includes(col)
    );
    
    if (availableColumns.length > 0) {
      setState(prev => ({
        ...prev,
        pivotConfig: {
          ...prev.pivotConfig,
          rowFields: [...prev.pivotConfig.rowFields, availableColumns[0]]
        }
      }));
    }
  };

  const handleValueFieldsChange = (values: string[]) => {
    setState(prev => ({
      ...prev,
      pivotConfig: {
        ...prev.pivotConfig,
        valueFields: values
      }
    }));
  };

  const handlePivotData = () => {
    if (
      !state.pivotFile || 
      !state.pivotConfig.columnField || 
      state.pivotConfig.valueFields.length === 0 || 
      state.pivotConfig.rowFields.length === 0
    ) {
      toast.error("Please complete pivot configuration");
      return;
    }

    try {
      const fileToModify = files.find(file => file.id === state.pivotFile);
      if (!fileToModify || !fileToModify.data) {
        toast.error("File data not found");
        return;
      }

      const pivotedData = pivotData(fileToModify.data, state.pivotConfig);
      
      if (pivotedData.length === 0) {
        toast.warning("No data after pivot operation");
        return;
      }

      const pivotColumns = Object.keys(pivotedData[0]);

      const pivotedFile = {
        id: `pivot-${Date.now()}`,
        name: `${fileToModify.name}-pivoted`,
        type: "text/csv",
        size: 0,
        content: "",
        data: pivotedData,
        columns: pivotColumns,
        selected: true
      };

      onComplete(pivotedData, [...files, pivotedFile]);
      toast.success(`Successfully pivoted data with ${pivotedData.length} rows`);
    } catch (error) {
      console.error("Error pivoting data:", error);
      toast.error("Failed to pivot data");
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Pivot Table Configuration" 
        description="Create a pivot table by selecting row fields (index), column field, value fields, and aggregation type."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="mb-4">
          <label className="text-sm font-medium">Select File</label>
          <Select
            value={state.pivotFile || ""}
            onValueChange={(value) => {
              setState({
                pivotFile: value,
                pivotConfig: {
                  rowFields: [],
                  columnField: "",
                  valueFields: [],
                  aggregation: "sum"
                }
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
        
        {state.pivotFile && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Row Fields (Index)</h4>
              {state.pivotConfig.rowFields.map((field, index) => (
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
                        .find(f => f.id === state.pivotFile)
                        ?.columns.filter(col => 
                          (col === field || 
                          (!state.pivotConfig.rowFields.includes(col) || state.pivotConfig.rowFields.indexOf(col) === index) && 
                          col !== state.pivotConfig.columnField && 
                          !state.pivotConfig.valueFields.includes(col))
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
                  !state.pivotFile || 
                  state.pivotConfig.rowFields.length >= 
                    (selectedFiles.find(f => f.id === state.pivotFile)?.columns.length || 0) - 2
                }
              >
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Add Row Field
              </Button>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Column Field</h4>
              <Select
                value={state.pivotConfig.columnField}
                onValueChange={(value) => setState(prev => ({ 
                  ...prev, 
                  pivotConfig: { ...prev.pivotConfig, columnField: value }
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column field" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFiles
                    .find(f => f.id === state.pivotFile)
                    ?.columns.filter(col => 
                      !state.pivotConfig.rowFields.includes(col) && !state.pivotConfig.valueFields.includes(col)
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
              {selectedFiles.find(f => f.id === state.pivotFile)?.columns && (
                <MultiSelect
                  options={selectedFiles
                    .find(f => f.id === state.pivotFile)
                    ?.columns.filter(col => 
                      !state.pivotConfig.rowFields.includes(col) && col !== state.pivotConfig.columnField
                    )
                    .map(col => ({ label: col, value: col })) || []
                  }
                  selected={state.pivotConfig.valueFields}
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
                value={state.pivotConfig.aggregation}
                onValueChange={(value: "sum" | "count" | "average" | "min" | "max") => 
                  setState(prev => ({ 
                    ...prev, 
                    pivotConfig: { ...prev.pivotConfig, aggregation: value }
                  }))
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

            {state.pivotConfig.rowFields.length > 0 && (
              <div className="bg-muted/30 p-3 rounded-md mt-4">
                <h4 className="text-sm font-medium mb-2">Pivot Table Preview</h4>
                <div className="text-xs">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium">Index (Row Fields):</div>
                    <div>{state.pivotConfig.rowFields.join(", ")}</div>
                    
                    <div className="font-medium">Column Field:</div>
                    <div>{state.pivotConfig.columnField || "Not selected"}</div>
                    
                    <div className="font-medium">Value Fields:</div>
                    <div>{state.pivotConfig.valueFields.length > 0 ? state.pivotConfig.valueFields.join(", ") : "Not selected"}</div>
                    
                    <div className="font-medium">Aggregation:</div>
                    <div className="capitalize">{state.pivotConfig.aggregation}</div>
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
            !state.pivotFile || 
            !state.pivotConfig.columnField || 
            state.pivotConfig.valueFields.length === 0 || 
            state.pivotConfig.rowFields.length === 0 ||
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
  );
};

export default PivotTab;

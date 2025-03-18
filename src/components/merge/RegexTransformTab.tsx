import React, { useState, useEffect } from "react";
import { Replace, PlusCircle, Wand2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps } from "./types";
import { generateCSV } from "@/utils/fileUtils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MAX_PREVIEW_ITEMS = 20;

const RegexTransformTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = useState({
    fileId: null as string | null,
    column: null as string | null,
    pattern: "",
    replacement: "",
    globalFlag: true,
    caseInsensitiveFlag: false,
    multilineFlag: false,
    previewTransform: true,
    preview: [] as { original: string; transformed: string }[],
    transformMode: 'modify' as 'modify' | 'newColumn',
    newColumnName: "",
    columnFormula: "",
    defaultValue: ""
  });

  // Update preview when inputs change
  useEffect(() => {
    if (state.previewTransform && state.fileId && state.column && (state.pattern || state.transformMode === 'newColumn')) {
      updatePreview();
    }
  }, [
    state.fileId, 
    state.column, 
    state.pattern, 
    state.replacement, 
    state.globalFlag, 
    state.caseInsensitiveFlag, 
    state.multilineFlag, 
    state.previewTransform,
    state.transformMode,
    state.newColumnName,
    state.columnFormula,
    state.defaultValue
  ]);

  const updatePreview = () => {
    try {
      const file = files.find(f => f.id === state.fileId);
      if (!file || !file.data || !state.column) return;

      // Get unique values
      const allValues = file.data.map(row => String(row[state.column as string] || ''));
      const uniqueValues = [...new Set(allValues)];
      
      // Get up to MAX_PREVIEW_ITEMS diverse samples
      let sampleValues: { original: string; transformed: string }[] = [];
      
      if (uniqueValues.length <= MAX_PREVIEW_ITEMS) {
        // If we have fewer unique values than MAX_PREVIEW_ITEMS, use all of them
        sampleValues = uniqueValues.map(value => ({ original: value, transformed: value }));
      } else {
        // Otherwise, get a representative sample
        const step = Math.floor(uniqueValues.length / MAX_PREVIEW_ITEMS);
        for (let i = 0; i < MAX_PREVIEW_ITEMS; i++) {
          const index = i * step;
          if (index < uniqueValues.length) {
            sampleValues.push({ 
              original: uniqueValues[index], 
              transformed: uniqueValues[index] 
            });
          }
        }
      }
      
      // Apply transformations
      sampleValues = sampleValues.map(({ original }) => {
        let transformed = original;

        if (state.transformMode === 'modify') {
          // Build regex flags
          let flags = '';
          if (state.globalFlag) flags += 'g';
          if (state.caseInsensitiveFlag) flags += 'i';
          if (state.multilineFlag) flags += 'm';

          try {
            // Create regex
            const regex = new RegExp(state.pattern, flags);
            transformed = original.replace(regex, state.replacement);
          } catch (e) {
            // If regex is invalid, don't transform
            transformed = original;
          }
        } else {
          // For new column mode
          if (state.columnFormula) {
            // Simple formula support: Use the column value or a default value
            transformed = state.columnFormula.includes("$value") 
              ? state.columnFormula.replace(/\$value/g, original)
              : state.defaultValue;
          } else {
            transformed = state.defaultValue;
          }
        }

        return { original, transformed };
      });

      setState(prev => ({ ...prev, preview: sampleValues }));
    } catch (error) {
      console.error("Error updating preview:", error);
    }
  };

  const handleTransform = () => {
    if (!state.fileId) {
      toast.error("Please select a file");
      return;
    }

    if (!state.column) {
      toast.error("Please select a column");
      return;
    }

    if (state.transformMode === 'modify' && !state.pattern) {
      toast.error("Please enter a regex pattern");
      return;
    }

    if (state.transformMode === 'newColumn' && !state.newColumnName) {
      toast.error("Please enter a name for the new column");
      return;
    }

    try {
      // Find the file to transform
      const fileToTransform = files.find(file => file.id === state.fileId);
      if (!fileToTransform || !fileToTransform.data) {
        toast.error("File data not found");
        return;
      }

      // Transform the data
      const transformedData = fileToTransform.data.map(row => {
        const newRow = { ...row };
        
        if (state.transformMode === 'modify') {
          // Build regex flags
          let flags = '';
          if (state.globalFlag) flags += 'g';
          if (state.caseInsensitiveFlag) flags += 'i';
          if (state.multilineFlag) flags += 'm';

          // Create regex
          const regex = new RegExp(state.pattern, flags);
          
          if (state.column && newRow[state.column] !== undefined) {
            newRow[state.column] = String(newRow[state.column] || '').replace(regex, state.replacement);
          }
        } else {
          // For new column mode
          if (state.column && state.newColumnName) {
            let value = state.defaultValue;
            
            if (state.columnFormula) {
              const colValue = String(newRow[state.column] || '');
              value = state.columnFormula.includes("$value") 
                ? state.columnFormula.replace(/\$value/g, colValue)
                : state.defaultValue;
            }
            
            newRow[state.newColumnName] = value;
          }
        }
        
        return newRow;
      });

      // Update columns list if a new column was added
      let updatedColumns = [...fileToTransform.columns];
      if (state.transformMode === 'newColumn' && state.newColumnName && !updatedColumns.includes(state.newColumnName)) {
        updatedColumns.push(state.newColumnName);
      }

      // Generate new CSV content and calculate size
      const newContent = generateCSV(transformedData);
      const newSize = new Blob([newContent]).size;

      // Update the file in the files array
      const updatedFiles = [...files];
      const fileIndex = updatedFiles.findIndex(f => f.id === state.fileId);
      
      if (fileIndex !== -1) {
        updatedFiles[fileIndex] = {
          ...fileToTransform,
          data: transformedData,
          content: newContent,
          size: newSize,
          columns: updatedColumns
        };
        
        onComplete(transformedData, updatedFiles);
        
        if (state.transformMode === 'modify') {
          toast.success(`Successfully applied regex transformation to column "${state.column}"`);
        } else {
          toast.success(`Successfully added new column "${state.newColumnName}"`);
        }
      }
    } catch (error) {
      console.error("Error applying transformation:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : "Invalid operation"}`);
    }
  };

  const columns = state.fileId 
    ? files.find(f => f.id === state.fileId)?.columns || [] 
    : [];

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Column Transformer" 
        description="Transform column values with regex or add new columns based on formulas."
      />
      
      <Card className="bg-card/90 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Replace className="h-5 w-5 text-primary" />
            Transform Configuration
          </CardTitle>
          <CardDescription>
            Select a file and column to modify existing values or create a new column
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Select File</Label>
                <Select
                  value={state.fileId || ""}
                  onValueChange={(value) => {
                    setState(prev => ({
                      ...prev,
                      fileId: value,
                      column: null,
                      preview: []
                    }));
                  }}
                >
                  <SelectTrigger className="w-full">
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
              
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Select Column</Label>
                <Select
                  value={state.column || ""}
                  onValueChange={(value) => {
                    setState(prev => ({
                      ...prev,
                      column: value,
                      preview: []
                    }));
                  }}
                  disabled={!state.fileId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label>Transformation Mode</Label>
                <RadioGroup
                  value={state.transformMode}
                  onValueChange={(value: 'modify' | 'newColumn') => 
                    setState(prev => ({ ...prev, transformMode: value }))
                  }
                  className="flex flex-col sm:flex-row gap-4 pt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="modify" id="modify" />
                    <Label htmlFor="modify" className="font-normal cursor-pointer">
                      Modify Existing Column
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="newColumn" id="newColumn" />
                    <Label htmlFor="newColumn" className="font-normal cursor-pointer">
                      Create New Column
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Tabs 
                value={state.transformMode} 
                onValueChange={(v: 'modify' | 'newColumn') => 
                  setState(prev => ({ ...prev, transformMode: v }))
                }
                className="w-full"
              >
                <TabsContent value="modify" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm font-medium">Regex Pattern</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>Enter a regular expression pattern to match values in the selected column.</p>
                              <p className="text-xs mt-1">Examples: <code>\d+</code> matches numbers, <code>[A-Z]+</code> matches uppercase letters</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        value={state.pattern}
                        onChange={(e) => setState(prev => ({ ...prev, pattern: e.target.value }))}
                        placeholder="e.g. \d+ or [A-Z]+"
                        className="font-mono"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Replacement</Label>
                      <Input
                        value={state.replacement}
                        onChange={(e) => setState(prev => ({ ...prev, replacement: e.target.value }))}
                        placeholder="e.g. - or replacement text"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="global"
                        checked={state.globalFlag}
                        onCheckedChange={(checked) => 
                          setState(prev => ({ ...prev, globalFlag: checked === true }))
                        }
                      />
                      <Label htmlFor="global" className="font-normal cursor-pointer">Global (g)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="case-insensitive"
                        checked={state.caseInsensitiveFlag}
                        onCheckedChange={(checked) => 
                          setState(prev => ({ ...prev, caseInsensitiveFlag: checked === true }))
                        }
                      />
                      <Label htmlFor="case-insensitive" className="font-normal cursor-pointer">Case Insensitive (i)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="multiline"
                        checked={state.multilineFlag}
                        onCheckedChange={(checked) => 
                          setState(prev => ({ ...prev, multilineFlag: checked === true }))
                        }
                      />
                      <Label htmlFor="multiline" className="font-normal cursor-pointer">Multiline (m)</Label>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="newColumn" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">New Column Name</Label>
                      <Input
                        value={state.newColumnName}
                        onChange={(e) => setState(prev => ({ ...prev, newColumnName: e.target.value }))}
                        placeholder="e.g. transformed_column"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm font-medium">Column Formula (Optional)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>Use <code>$value</code> to reference the value from the selected column.</p>
                              <p className="text-xs mt-1">Examples: <code>prefix_$value</code>, <code>$value_suffix</code>, <code>$value-transformed</code></p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        value={state.columnFormula}
                        onChange={(e) => setState(prev => ({ ...prev, columnFormula: e.target.value }))}
                        placeholder="e.g. prefix_$value or $value_suffix"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Default Value</Label>
                      <Input
                        value={state.defaultValue}
                        onChange={(e) => setState(prev => ({ ...prev, defaultValue: e.target.value }))}
                        placeholder="Value to use when no formula is provided"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-md p-3 text-sm text-amber-800 dark:text-amber-300">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>To use the selected column's value in your new column, include <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">$value</code> in your formula.</p>
                        <p className="mt-1">If no formula is provided, the default value will be used for all rows.</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="preview-transform"
                checked={state.previewTransform}
                onCheckedChange={(checked) => {
                  setState(prev => ({ ...prev, previewTransform: checked }));
                }}
              />
              <Label htmlFor="preview-transform" className="font-normal cursor-pointer">Show live preview</Label>
            </div>
            
            {state.previewTransform && state.preview.length > 0 && (
              <div className="border rounded-md p-4 bg-muted/20">
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Wand2 className="h-4 w-4 mr-1.5 text-primary" />
                  Preview ({state.preview.length > 1 ? `${state.preview.length} unique values` : '1 value'})
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {state.preview.map((item, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 text-sm p-2 rounded-sm odd:bg-muted/10">
                      <div className="overflow-hidden text-ellipsis">
                        <span className="text-muted-foreground font-medium mr-1">Original:</span>
                        <span className="font-mono">{item.original || "(empty)"}</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis">
                        <span className="text-muted-foreground font-medium mr-1">
                          {state.transformMode === 'modify' ? 'Transformed:' : 'New Column:'}
                        </span>
                        <span className={
                          item.original !== item.transformed 
                            ? "text-green-600 dark:text-green-400 font-mono" 
                            : "font-mono"
                        }>
                          {item.transformed || "(empty)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Button
            onClick={handleTransform}
            disabled={
              !state.fileId || 
              !state.column || 
              (state.transformMode === 'modify' && !state.pattern) || 
              (state.transformMode === 'newColumn' && !state.newColumnName) || 
              isProcessing
            }
            className="hover-scale"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                {state.transformMode === 'modify' ? (
                  <>
                    <Replace className="mr-2 h-4 w-4" />
                    Apply Regex Transformation
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Column
                  </>
                )}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegexTransformTab;

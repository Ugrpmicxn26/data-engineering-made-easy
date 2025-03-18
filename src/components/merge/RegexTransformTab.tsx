
import React, { useState, useEffect } from "react";
import { Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps } from "./types";
import { generateCSV } from "@/utils/fileUtils";
import { toast } from "sonner";

interface RegexTransformState {
  fileId: string | null;
  column: string | null;
  pattern: string;
  replacement: string;
  globalFlag: boolean;
  caseInsensitiveFlag: boolean;
  multilineFlag: boolean;
  previewTransform: boolean;
  preview: { original: string; transformed: string }[];
}

const RegexTransformTab: React.FC<ActionTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [state, setState] = useState<RegexTransformState>({
    fileId: null,
    column: null,
    pattern: "",
    replacement: "",
    globalFlag: true,
    caseInsensitiveFlag: false,
    multilineFlag: false,
    previewTransform: false,
    preview: []
  });

  // Update preview when inputs change
  useEffect(() => {
    if (state.previewTransform && state.fileId && state.column && state.pattern) {
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
    state.previewTransform
  ]);

  const updatePreview = () => {
    try {
      const file = files.find(f => f.id === state.fileId);
      if (!file || !file.data || !state.column) return;

      // Build regex flags
      let flags = '';
      if (state.globalFlag) flags += 'g';
      if (state.caseInsensitiveFlag) flags += 'i';
      if (state.multilineFlag) flags += 'm';

      // Create regex
      const regex = new RegExp(state.pattern, flags);

      // Get sample values (first 5)
      const sampleValues = file.data
        .slice(0, 5)
        .map(row => ({
          original: String(row[state.column as string] || ''),
          transformed: String(row[state.column as string] || '').replace(regex, state.replacement)
        }));

      setState(prev => ({ ...prev, preview: sampleValues }));
    } catch (error) {
      console.error("Error updating preview:", error);
    }
  };

  const handleTransform = () => {
    if (!state.fileId || !state.column || !state.pattern) {
      toast.error("Please select a file, column, and enter a regex pattern");
      return;
    }

    try {
      // Build regex flags
      let flags = '';
      if (state.globalFlag) flags += 'g';
      if (state.caseInsensitiveFlag) flags += 'i';
      if (state.multilineFlag) flags += 'm';

      // Create regex
      const regex = new RegExp(state.pattern, flags);

      // Find the file to transform
      const fileToTransform = files.find(file => file.id === state.fileId);
      if (!fileToTransform || !fileToTransform.data) {
        toast.error("File data not found");
        return;
      }

      // Transform the data
      const transformedData = fileToTransform.data.map(row => {
        const newRow = { ...row };
        if (state.column && newRow[state.column] !== undefined) {
          newRow[state.column] = String(newRow[state.column] || '').replace(regex, state.replacement);
        }
        return newRow;
      });

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
          size: newSize // Update the file size
        };
        
        onComplete(transformedData, updatedFiles);
        toast.success(`Successfully applied regex transformation to column "${state.column}"`);
      }
    } catch (error) {
      console.error("Error applying regex transformation:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : "Invalid regex pattern"}`);
    }
  };

  const columns = state.fileId 
    ? files.find(f => f.id === state.fileId)?.columns || [] 
    : [];

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Regex Transform" 
        description="Apply regex pattern replacement to values in a specific column."
      />
      
      <div className="p-4 bg-card rounded-lg border">
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Select File</label>
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
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-1 block">Select Column</label>
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
                <SelectTrigger>
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
            <div>
              <label className="text-sm font-medium mb-1 block">Regex Pattern</label>
              <Input
                value={state.pattern}
                onChange={(e) => setState(prev => ({ ...prev, pattern: e.target.value }))}
                placeholder="e.g. \d+ or [A-Z]+"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Replacement</label>
              <Input
                value={state.replacement}
                onChange={(e) => setState(prev => ({ ...prev, replacement: e.target.value }))}
                placeholder="e.g. - or replacement text"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="global"
                checked={state.globalFlag}
                onCheckedChange={(checked) => 
                  setState(prev => ({ ...prev, globalFlag: checked === true }))
                }
              />
              <Label htmlFor="global">Global (g)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-insensitive"
                checked={state.caseInsensitiveFlag}
                onCheckedChange={(checked) => 
                  setState(prev => ({ ...prev, caseInsensitiveFlag: checked === true }))
                }
              />
              <Label htmlFor="case-insensitive">Case Insensitive (i)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="multiline"
                checked={state.multilineFlag}
                onCheckedChange={(checked) => 
                  setState(prev => ({ ...prev, multilineFlag: checked === true }))
                }
              />
              <Label htmlFor="multiline">Multiline (m)</Label>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="preview-transform"
              checked={state.previewTransform}
              onCheckedChange={(checked) => {
                setState(prev => ({ ...prev, previewTransform: checked }));
              }}
            />
            <Label htmlFor="preview-transform">Show live preview</Label>
          </div>
          
          {state.previewTransform && state.preview.length > 0 && (
            <div className="mt-4 border rounded-md p-3 bg-muted/30">
              <h4 className="text-sm font-medium mb-2">Preview (first 5 values)</h4>
              <div className="space-y-2">
                {state.preview.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-muted-foreground">Original: </span>
                      {item.original}
                    </div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-muted-foreground">Transformed: </span>
                      <span className={item.original !== item.transformed ? "text-green-500 font-medium" : ""}>
                        {item.transformed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleTransform}
          disabled={!state.fileId || !state.column || !state.pattern || isProcessing}
          className="hover-scale"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Replace className="mr-2 h-4 w-4" />
              Apply Regex Transformation
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default RegexTransformTab;

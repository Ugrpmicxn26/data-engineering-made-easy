
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FileData } from "@/utils/fileUtils";
import { toast } from "sonner";
import { FileCode, Play, Save, PanelRight, Eye } from "lucide-react";
import DataTable from "@/components/DataTable";
import ConfigHeader from "./ConfigHeader";

interface PythonTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

const PythonTab: React.FC<PythonTabProps> = ({ 
  files, 
  selectedFiles, 
  isProcessing, 
  onComplete 
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [pythonCode, setPythonCode] = useState<string>("");
  const [pythonOutput, setPythonOutput] = useState<string>("");
  const [outputData, setOutputData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Default Python code template
  const defaultPythonCode = `# Python Notebook
# Available packages: pandas, numpy, matplotlib, seaborn, scikit-learn
# The DataFrame is already loaded as 'df'

import pandas as pd
import numpy as np

# Display first 5 rows
df.head()

# Basic info about the DataFrame
print(df.info())
print(df.describe())

# Example: Filter data
# filtered_df = df[df['column_name'] > 10]

# Example: Create a new column
# df['new_column'] = df['column1'] * df['column2']

# Example: Group by and aggregate
# grouped_df = df.groupby('column_name').agg({'other_column': 'mean'})

# Return the final DataFrame to update the preview
df
`;

  // When selected file changes, update the code and reset outputs
  useEffect(() => {
    if (selectedFiles.length > 0 && !selectedFileId) {
      setSelectedFileId(selectedFiles[0].id);
    }
    
    if (!pythonCode) {
      setPythonCode(defaultPythonCode);
    }
    
    setPythonOutput("");
    setOutputData([]);
    setError(null);
  }, [selectedFileId, selectedFiles]);

  // Update preview data when file selection changes
  useEffect(() => {
    if (selectedFileId) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.data) {
        setOutputData(file.data.slice(0, 100)); // Show only first 100 rows initially
      }
    }
  }, [selectedFileId, files]);

  const handleExecutePython = () => {
    // Since we can't actually run Python in the browser, we'll simulate it
    // In a real implementation, this would need to use a backend service
    setLoading(true);
    setError(null);
    setPythonOutput("");
    
    const file = files.find(f => f.id === selectedFileId);
    if (!file || !file.data) {
      setError("File data not found");
      setLoading(false);
      return;
    }
    
    setTimeout(() => {
      try {
        // Simulate Python execution with JavaScript
        let outputText = "# Python Output (Simulated)\n\n";
        let resultData = [...file.data];
        
        // Parse the Python code and perform simple operations
        if (pythonCode.includes("df.head()")) {
          outputText += "# First 5 rows of the DataFrame:\n";
          outputText += JSON.stringify(resultData.slice(0, 5), null, 2) + "\n\n";
        }
        
        if (pythonCode.includes("df.info()")) {
          outputText += "# DataFrame Info:\n";
          const columns = Object.keys(resultData[0] || {});
          outputText += `RangeIndex: ${resultData.length} entries, 0 to ${resultData.length - 1}\n`;
          outputText += `Data columns (total ${columns.length}):\n`;
          columns.forEach((col, i) => {
            outputText += ` #   Column: ${col}\n`;
          });
          outputText += "\n";
        }
        
        if (pythonCode.includes("df.describe()")) {
          outputText += "# DataFrame Statistics:\n";
          const columns = Object.keys(resultData[0] || {});
          const stats = {
            count: {},
            mean: {},
            std: {},
            min: {},
            "25%": {},
            "50%": {},
            "75%": {},
            max: {},
          };
          
          columns.forEach(col => {
            const values = resultData.map(row => row[col]).filter(val => !isNaN(Number(val))).map(Number);
            if (values.length > 0) {
              stats.count[col] = values.length;
              stats.mean[col] = values.reduce((a, b) => a + b, 0) / values.length;
              stats.min[col] = Math.min(...values);
              stats.max[col] = Math.max(...values);
              stats["50%"][col] = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
            }
          });
          
          outputText += JSON.stringify(stats, null, 2) + "\n\n";
        }
        
        // Check for filter operations
        if (pythonCode.includes("df[df['")) {
          outputText += "# Filtered DataFrame:\n";
          const filterMatch = pythonCode.match(/df\[df\['([^']+)'\] ([><=]+) ([^\]]+)\]/);
          if (filterMatch) {
            const [_, column, operator, valueStr] = filterMatch;
            const value = Number(valueStr.trim());
            
            resultData = resultData.filter(row => {
              const colValue = Number(row[column]);
              switch (operator) {
                case '>': return colValue > value;
                case '<': return colValue < value;
                case '>=': return colValue >= value;
                case '<=': return colValue <= value;
                case '==': return colValue === value;
                default: return true;
              }
            });
            
            outputText += `Filtered by ${column} ${operator} ${value}\n`;
            outputText += `Result has ${resultData.length} rows\n\n`;
          }
        }
        
        // Check for new column creation
        if (pythonCode.includes("df['new_column']")) {
          const newColMatch = pythonCode.match(/df\['([^']+)'\] = df\['([^']+)'\] \* df\['([^']+)'\]/);
          if (newColMatch) {
            const [_, newCol, col1, col2] = newColMatch;
            resultData = resultData.map(row => ({
              ...row,
              [newCol]: Number(row[col1]) * Number(row[col2])
            }));
            
            outputText += `# Added new column: ${newCol}\n\n`;
          }
        }
        
        // Check for groupby
        if (pythonCode.includes("df.groupby(")) {
          const groupByMatch = pythonCode.match(/df.groupby\('([^']+)'\).agg\(\{'([^']+)': '([^']+)'\}\)/);
          if (groupByMatch) {
            const [_, groupCol, aggCol, aggFunc] = groupByMatch;
            
            // Simple group by implementation
            const groups = {};
            resultData.forEach(row => {
              const key = row[groupCol];
              if (!groups[key]) {
                groups[key] = [];
              }
              groups[key].push(row);
            });
            
            resultData = Object.entries(groups).map(([key, rows]) => {
              const aggRows = rows as any[];
              let aggValue = 0;
              
              if (aggFunc === 'mean') {
                const sum = aggRows.reduce((acc, row) => acc + Number(row[aggCol]), 0);
                aggValue = sum / aggRows.length;
              } else if (aggFunc === 'sum') {
                aggValue = aggRows.reduce((acc, row) => acc + Number(row[aggCol]), 0);
              } else if (aggFunc === 'count') {
                aggValue = aggRows.length;
              }
              
              return {
                [groupCol]: key,
                [`${aggCol}_${aggFunc}`]: aggValue
              };
            });
            
            outputText += `# Grouped by: ${groupCol}, aggregated ${aggCol} with ${aggFunc}\n`;
            outputText += `Result has ${resultData.length} rows\n\n`;
          }
        }
        
        // Final output
        outputText += "# Final DataFrame Result:\n";
        outputText += `${resultData.length} rows × ${Object.keys(resultData[0] || {}).length} columns\n`;
        
        setPythonOutput(outputText);
        setOutputData(resultData);
        setLoading(false);
        toast.success("Python code executed successfully");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setLoading(false);
        toast.error(`Error executing Python code: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }, 1000); // Simulate processing delay
  };

  const handleSave = () => {
    if (outputData.length > 0 && selectedFileId) {
      const sourceFile = files.find(f => f.id === selectedFileId);
      let newFileName = "python-transformed.csv";
      if (sourceFile) {
        const baseName = sourceFile.name.replace(/\.[^/.]+$/, "");
        newFileName = `${baseName}-python.csv`;
      }
      
      onComplete(outputData, undefined, false);
      toast.success("Python transformation saved");
    } else {
      toast.error("No data to save");
    }
  };

  if (selectedFiles.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <FileCode className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No Files Selected</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Please select at least one file to begin Python transformations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfigHeader
        title="Python Notebook"
        description="Transform your data using Python libraries like pandas, numpy, and more"
        icon={<FileCode className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-4">
        <div className="flex justify-between items-center">
          <Select value={selectedFileId} onValueChange={setSelectedFileId}>
            <SelectTrigger className="max-w-[300px]">
              <SelectValue placeholder="Select a file to transform" />
            </SelectTrigger>
            <SelectContent>
              {selectedFiles.map(file => (
                <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExecutePython}
              disabled={loading || !selectedFileId}
              isLoading={loading}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Run Python Code
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={loading || outputData.length === 0}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Results
            </Button>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="min-h-[600px] border rounded-lg bg-background">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="bg-muted p-2 text-sm font-medium">Python Code</div>
              <Textarea
                value={pythonCode}
                onChange={(e) => setPythonCode(e.target.value)}
                className="flex-1 font-mono text-sm p-4 border-0 resize-none focus-visible:ring-0 rounded-none"
                placeholder="Write your Python code here..."
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50}>
            <div className="h-full flex flex-col">
              <div className="bg-muted p-2 text-sm font-medium">
                Output
              </div>
              <div className="flex-1 flex flex-col">
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={40} minSize={15}>
                    <div className="h-full overflow-auto">
                      <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                        {error ? (
                          <div className="text-destructive">{error}</div>
                        ) : pythonOutput ? (
                          pythonOutput
                        ) : (
                          "Run the code to see the output here."
                        )}
                      </pre>
                    </div>
                  </ResizablePanel>
                  
                  <ResizableHandle withHandle />
                  
                  <ResizablePanel defaultSize={60}>
                    <div className="h-full overflow-auto p-1">
                      <DataTable 
                        data={outputData} 
                        maxHeight="100%"
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default PythonTab;

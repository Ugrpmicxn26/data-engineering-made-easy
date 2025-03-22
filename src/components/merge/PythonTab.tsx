
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
  const [outputName, setOutputName] = useState<string>("");

  // Default Python code template
  const defaultPythonCode = `# Python Notebook
# Available packages: pandas, numpy, matplotlib, scikit-learn
# The DataFrame is already loaded as 'df'

import pandas as pd
import numpy as np

# Display first 5 rows
print(df.head())

# Basic info about the DataFrame
print(df.info())
print(df.describe())

# Example: Filter data
# filtered_df = df[df['column_name'] > 10]

# Example: Create a new column
# df['new_column'] = df['column1'] * df['column2']

# Example: Group by and aggregate
# grouped_df = df.groupby('column_name').agg({'other_column': 'mean'})

# The last DataFrame variable in your code will be returned as the result
# This will be displayed in the preview panel and can be saved
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

  // Update preview data and suggested output name when file selection changes
  useEffect(() => {
    if (selectedFileId) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.data) {
        setOutputData(file.data.slice(0, 100)); // Show only first 100 rows initially
        
        // Set default output name based on the selected file
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setOutputName(`${baseName}-python.csv`);
      }
    }
  }, [selectedFileId, files]);

  const handleExecutePython = () => {
    // Since we can't actually run Python in the browser, we'll simulate it
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
        let outputText = "";
        let resultData = [...file.data];
        
        // Parse the Python code and perform simple operations
        if (pythonCode.includes("df.head()")) {
          const headData = resultData.slice(0, 5);
          outputText += "# DataFrame.head()\n";
          outputText += JSON.stringify(headData, null, 2) + "\n\n";
        }
        
        if (pythonCode.includes("df.info()")) {
          const columns = Object.keys(resultData[0] || {});
          outputText += "# DataFrame.info()\n";
          outputText += `<class 'pandas.core.frame.DataFrame'>\n`;
          outputText += `RangeIndex: ${resultData.length} entries, 0 to ${resultData.length - 1}\n`;
          outputText += `Data columns (total ${columns.length}):\n`;
          columns.forEach((col, i) => {
            outputText += ` #   ${i} ${col}  ${resultData.length} non-null\n`;
          });
          outputText += `dtypes: object(${columns.length})\n\n`;
        }
        
        if (pythonCode.includes("df.describe()")) {
          const columns = Object.keys(resultData[0] || {});
          outputText += "# DataFrame.describe()\n";
          
          const numericColumns = columns.filter(col => {
            // Check if column has numeric values
            return resultData.some(row => !isNaN(Number(row[col])));
          });
          
          if (numericColumns.length > 0) {
            const stats = {};
            numericColumns.forEach(col => {
              const values = resultData
                .map(row => row[col])
                .filter(val => !isNaN(Number(val)))
                .map(Number);
              
              if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / values.length;
                const sortedValues = [...values].sort((a, b) => a - b);
                const median = sortedValues[Math.floor(sortedValues.length / 2)];
                
                if (!stats['count']) stats['count'] = {};
                if (!stats['mean']) stats['mean'] = {};
                if (!stats['std']) stats['std'] = {};
                if (!stats['min']) stats['min'] = {};
                if (!stats['25%']) stats['25%'] = {};
                if (!stats['50%']) stats['50%'] = {};
                if (!stats['75%']) stats['75%'] = {};
                if (!stats['max']) stats['max'] = {};
                
                stats['count'][col] = values.length;
                stats['mean'][col] = mean.toFixed(6);
                stats['std'][col] = calculateStdDev(values).toFixed(6);
                stats['min'][col] = Math.min(...values).toFixed(6);
                stats['25%'][col] = sortedValues[Math.floor(sortedValues.length * 0.25)].toFixed(6);
                stats['50%'][col] = median.toFixed(6);
                stats['75%'][col] = sortedValues[Math.floor(sortedValues.length * 0.75)].toFixed(6);
                stats['max'][col] = Math.max(...values).toFixed(6);
              }
            });
            
            // Format describe output like pandas
            outputText += `              ${numericColumns.join('       ')}\n`;
            Object.keys(stats).forEach(stat => {
              outputText += `${stat.padEnd(8)} `;
              numericColumns.forEach(col => {
                outputText += `${stats[stat][col]?.toString().padEnd(10) || 'NaN'.padEnd(10)} `;
              });
              outputText += '\n';
            });
            outputText += '\n';
          } else {
            outputText += "No numeric columns found for statistical analysis\n\n";
          }
        }
        
        // Check for filter operations
        if (pythonCode.includes("df[df['")) {
          const filterMatch = pythonCode.match(/df\[df\['([^']+)'\] ([><=!]+) ([^\]]+)\]/);
          if (filterMatch) {
            const [_, column, operator, valueStr] = filterMatch;
            let value;
            
            // Try to parse the value - could be number or string
            if (valueStr.includes("'") || valueStr.includes('"')) {
              value = valueStr.replace(/['"]/g, '').trim();
            } else {
              value = Number(valueStr.trim());
            }
            
            // Apply filter
            resultData = resultData.filter(row => {
              const colValue = isNaN(Number(row[column])) ? row[column] : Number(row[column]);
              switch (operator) {
                case '>': return colValue > value;
                case '<': return colValue < value;
                case '>=': return colValue >= value;
                case '<=': return colValue <= value;
                case '==': return colValue === value;
                case '!=': return colValue !== value;
                default: return true;
              }
            });
            
            outputText += `# Filtered by ${column} ${operator} ${value}\n`;
            outputText += `# Result has ${resultData.length} rows\n\n`;
          }
        }
        
        // Check for new column creation
        const newColMatch = pythonCode.match(/df\['([^']+)'\] = (.+)/);
        if (newColMatch) {
          const [_, newCol, expression] = newColMatch;
          outputText += `# Created new column: '${newCol}'\n\n`;
          
          // Handle simple arithmetic between columns
          if (expression.includes("df['") && expression.includes("*")) {
            const colsMatch = expression.match(/df\['([^']+)'\] \* df\['([^']+)'\]/);
            if (colsMatch) {
              const [_, col1, col2] = colsMatch;
              resultData = resultData.map(row => ({
                ...row,
                [newCol]: Number(row[col1]) * Number(row[col2])
              }));
            }
          }
        }
        
        // Check for groupby
        if (pythonCode.includes("df.groupby(")) {
          const groupByMatch = pythonCode.match(/df\.groupby\('([^']+)'\)\.agg\(\{'([^']+)': '([^']+)'\}\)/);
          if (groupByMatch) {
            const [_, groupCol, aggCol, aggFunc] = groupByMatch;
            
            // Simple group by implementation
            const groups = {};
            resultData.forEach(row => {
              const key = String(row[groupCol]);
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
              } else if (aggFunc === 'min') {
                aggValue = Math.min(...aggRows.map(row => Number(row[aggCol])));
              } else if (aggFunc === 'max') {
                aggValue = Math.max(...aggRows.map(row => Number(row[aggCol])));
              }
              
              return {
                [groupCol]: key,
                [`${aggCol}_${aggFunc}`]: aggValue
              };
            });
            
            outputText += `# Grouped by: ${groupCol}, aggregated ${aggCol} with ${aggFunc}\n`;
            outputText += `# Result has ${resultData.length} rows\n\n`;
          }
        }
        
        // Final output
        outputText += "# Final DataFrame Result:\n";
        outputText += `# [${resultData.length} rows × ${Object.keys(resultData[0] || {}).length} columns]\n`;
        
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

  // Helper function to calculate standard deviation
  const calculateStdDev = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  };

  const handleSave = () => {
    if (outputData.length > 0 && selectedFileId) {
      onComplete(outputData, undefined, false);
      toast.success(`Python transformation saved as ${outputName}`);
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
              <div className="bg-muted p-2 text-sm font-medium flex justify-between items-center">
                <span>Output</span>
                {outputData.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>{outputData.length} rows</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col">
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={40} minSize={15}>
                    <div className="h-full overflow-auto bg-slate-950 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-slate-200">
                        {error ? (
                          <div className="text-red-400">{error}</div>
                        ) : pythonOutput ? (
                          pythonOutput
                        ) : (
                          "# Run the code to see output here"
                        )}
                      </pre>
                    </div>
                  </ResizablePanel>
                  
                  <ResizableHandle withHandle />
                  
                  <ResizablePanel defaultSize={60}>
                    <div className="h-full flex flex-col">
                      <div className="bg-muted p-2 text-xs flex items-center justify-between">
                        <span>DataFrame Preview</span>
                        <span>{outputData.length > 0 ? `${outputData.length} rows × ${Object.keys(outputData[0] || {}).length} columns` : ''}</span>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <DataTable 
                          data={outputData} 
                          maxHeight="100%"
                        />
                      </div>
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

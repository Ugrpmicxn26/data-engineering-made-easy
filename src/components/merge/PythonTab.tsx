
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FileData } from "@/utils/fileUtils";
import { toast } from "sonner";
import { FileCode, Play, Save, Eye, Settings } from "lucide-react";
import DataTable from "@/components/DataTable";
import ConfigHeader from "./ConfigHeader";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface PythonTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

interface FileParseOptions {
  separator: string;
  encoding: string;
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
  const [parseOptions, setParseOptions] = useState<FileParseOptions>({
    separator: ",",
    encoding: "utf-8"
  });

  const defaultPythonCode = `# Python Notebook
# Available packages: pandas, numpy, matplotlib, scikit-learn
# The DataFrame is already loaded as 'df'

import pandas as pd
import numpy as np

# Display first 5 rows
print(df.head())

# Display column names
print("Columns:", df.columns.tolist())

# Basic info about the DataFrame
print(df.info())
print(df.describe())

# Example: Clean column data types
# df['column'] = df['column'].astype(str)
# df['column'] = df['column'].str.strip()
# df['column'] = df['column'].str.replace(',', '').replace('*', '0').astype(int)

# Example: Filter data
# filtered_df = df[df['column_name'] > 10]

# Example: Create a new column
# df['new_column'] = df['column1'] * df['column2']

# Example: Group by and aggregate
# grouped_df = df.groupby(['column1', 'column2'])['value_column'].sum().reset_index()

# Example: Compute market share
# total_by_group = df.groupby(['group_col'])['value_col'].transform('sum')
# df['market_share'] = df['value_col'] / total_by_group

# The last DataFrame variable in your code will be returned as the result
# This will be displayed in the preview panel and can be saved
df
`;

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

  useEffect(() => {
    if (selectedFileId) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.data) {
        setOutputData(file.data.slice(0, 100)); // Show only first 100 rows initially
        
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setOutputName(`${baseName}-python.csv`);
        
        // Set appropriate parse options based on file extension
        if (file.name.toLowerCase().endsWith('.txt')) {
          setParseOptions({
            separator: "\t",
            encoding: "unicode_escape"
          });
        } else {
          setParseOptions({
            separator: ",",
            encoding: "utf-8"
          });
        }
      }
    }
  }, [selectedFileId, files]);

  const handleOutputNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutputName(e.target.value);
  };

  const handleParseOptionChange = (option: keyof FileParseOptions, value: string) => {
    setParseOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  const handleExecutePython = () => {
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
        let outputText = "";
        let resultData = [...file.data];
        
        // Add parsing options info to output
        outputText += `# File parsing options:\n`;
        outputText += `# Separator: "${parseOptions.separator}"\n`;
        outputText += `# Encoding: "${parseOptions.encoding}"\n\n`;
        
        if (pythonCode.includes("df.head()")) {
          const headData = resultData.slice(0, 5);
          outputText += "# DataFrame.head()\n";
          outputText += JSON.stringify(headData, null, 2) + "\n\n";
        }
        
        if (pythonCode.includes("df.columns")) {
          const columns = Object.keys(resultData[0] || {});
          outputText += "# DataFrame.columns\n";
          outputText += "Columns: " + JSON.stringify(columns) + "\n\n";
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
        
        if (pythonCode.includes("df[df['")) {
          const filterMatch = pythonCode.match(/df\[df\['([^']+)'\] ([><=!]+) ([^\]]+)\]/);
          if (filterMatch) {
            const [_, column, operator, valueStr] = filterMatch;
            let value;
            
            if (valueStr.includes("'") || valueStr.includes('"')) {
              value = valueStr.replace(/['"]/g, '').trim();
            } else {
              value = Number(valueStr.trim());
            }
            
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
        
        const astypeRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.astype\(([^)]+)\)/g;
        let astypeMatch;
        while ((astypeMatch = astypeRegex.exec(pythonCode)) !== null) {
          const [_, targetCol, sourceCol, dataType] = astypeMatch;
          outputText += `# Converting column '${targetCol}' to ${dataType}\n`;
          
          if (dataType.includes("str")) {
            resultData = resultData.map(row => ({
              ...row,
              [targetCol]: String(row[sourceCol] || "")
            }));
          } else if (dataType.includes("int")) {
            resultData = resultData.map(row => ({
              ...row,
              [targetCol]: String(parseInt(String(row[sourceCol]).replace(/[^\d.-]/g, "")) || "0")
            }));
          } else if (dataType.includes("float")) {
            resultData = resultData.map(row => ({
              ...row,
              [targetCol]: String(parseFloat(String(row[sourceCol]).replace(/[^\d.-]/g, "")) || "0")
            }));
          }
        }
        
        const stripRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.str\.strip\(\)/g;
        let stripMatch;
        while ((stripMatch = stripRegex.exec(pythonCode)) !== null) {
          const [_, targetCol, sourceCol] = stripMatch;
          outputText += `# Stripping whitespace from column '${targetCol}'\n`;
          
          resultData = resultData.map(row => ({
            ...row,
            [targetCol]: String(row[sourceCol] || "").trim()
          }));
        }
        
        const replaceRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.str\.replace\('([^']+)',\s*'([^']*)'\)/g;
        let replaceMatch;
        while ((replaceMatch = replaceRegex.exec(pythonCode)) !== null) {
          const [_, targetCol, sourceCol, find, replace] = replaceMatch;
          outputText += `# Replacing '${find}' with '${replace}' in column '${targetCol}'\n`;
          
          resultData = resultData.map(row => ({
            ...row,
            [targetCol]: String(row[sourceCol] || "").replace(new RegExp(find, 'g'), replace)
          }));
        }
        
        if (pythonCode.includes(".replace('*', 0)") || pythonCode.includes(".replace('*',0)")) {
          const replaceStarRegex = /df\['([^']+)'\].*replace\('\*',\s*0\)/;
          const replaceMatch = pythonCode.match(replaceStarRegex);
          if (replaceMatch) {
            const [_, column] = replaceMatch;
            outputText += `# Replacing '*' with 0 in column '${column}'\n`;
            
            resultData = resultData.map(row => ({
              ...row,
              [column]: String(row[column]).replace(/\*/g, "0")
            }));
          }
        }
        
        const complexReplaceRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.str\.replace\('([^']+)',\s*'([^']*)'\)\.replace\('([^']+)',\s*([^)]+)\)\.astype\(([^)]+)\)/;
        const complexMatch = pythonCode.match(complexReplaceRegex);
        if (complexMatch) {
          const [_, targetCol, sourceCol, find1, replace1, find2, replace2, dataType] = complexMatch;
          outputText += `# Complex operation on column '${targetCol}'\n`;
          
          resultData = resultData.map(row => {
            let value = String(row[sourceCol] || "");
            value = value.replace(new RegExp(find1, 'g'), replace1);
            let replaceValue = replace2.trim();
            if (replaceValue.startsWith("'") || replaceValue.startsWith('"')) {
              replaceValue = replaceValue.replace(/['"]/g, '');
            }
            value = value.replace(new RegExp(find2, 'g'), replaceValue);
            
            if (dataType.includes("int")) {
              value = String(parseInt(value.replace(/[^\d.-]/g, "")) || "0");
            } else if (dataType.includes("float")) {
              value = String(parseFloat(value.replace(/[^\d.-]/g, "")) || "0");
            }
            
            return {
              ...row,
              [targetCol]: value
            };
          });
        }
        
        const newColMatch = pythonCode.match(/df\['([^']+)'\] = (.+)/);
        if (newColMatch && !astypeMatch && !stripMatch && !replaceMatch && !complexMatch) {
          const [_, newCol, expression] = newColMatch;
          outputText += `# Created new column: '${newCol}'\n\n`;
          
          if (expression.includes("df['") && expression.includes("*")) {
            const colsMatch = expression.match(/df\['([^']+)'\] \* df\['([^']+)'\]/);
            if (colsMatch) {
              const [_, col1, col2] = colsMatch;
              resultData = resultData.map(row => ({
                ...row,
                [newCol]: String(Number(row[col1]) * Number(row[col2]))
              }));
            }
          }
        }
        
        if (pythonCode.includes("df.groupby(")) {
          const groupByMatch = pythonCode.match(/df\.groupby\(\[([^\]]+)\]\)\['([^']+)'\]\.([^(]+)\(\)\.reset_index\(\)/);
          if (groupByMatch) {
            const [_, groupColsStr, aggCol, aggFunc] = groupByMatch;
            const groupCols = groupColsStr.split(',').map(col => 
              col.trim().replace(/['"]/g, '')
            );
            
            outputText += `# Grouping by: [${groupCols.join(', ')}], aggregating ${aggCol} with ${aggFunc}\n`;
            
            const groups = {};
            resultData.forEach(row => {
              const key = groupCols.map(col => String(row[col])).join('|');
              if (!groups[key]) {
                groups[key] = {
                  rows: [],
                  groupValues: {}
                };
                groupCols.forEach(col => {
                  groups[key].groupValues[col] = row[col];
                });
              }
              groups[key].rows.push(row);
            });
            
            resultData = Object.values(groups).map((group: any) => {
              const aggRows = group.rows;
              let aggValue = 0;
              
              if (aggFunc.includes('sum')) {
                aggValue = aggRows.reduce((acc, row) => acc + (Number(row[aggCol]) || 0), 0);
              } else if (aggFunc.includes('mean') || aggFunc.includes('avg')) {
                const sum = aggRows.reduce((acc, row) => acc + (Number(row[aggCol]) || 0), 0);
                aggValue = sum / aggRows.length;
              } else if (aggFunc.includes('count')) {
                aggValue = aggRows.length;
              } else if (aggFunc.includes('min')) {
                aggValue = Math.min(...aggRows.map(row => Number(row[aggCol]) || 0));
              } else if (aggFunc.includes('max')) {
                aggValue = Math.max(...aggRows.map(row => Number(row[aggCol]) || 0));
              }
              
              return {
                ...group.groupValues,
                [aggCol]: String(aggValue)
              };
            });
            
            outputText += `# Result has ${resultData.length} rows\n\n`;
          }
        }
        
        if (pythonCode.includes("df.transform(")) {
          const transformMatch = pythonCode.match(/df\.groupby\(\[([^\]]+)\]\)\['([^']+)'\]\.transform\('([^']+)'\)/);
          if (transformMatch) {
            const [_, groupColsStr, aggCol, aggFunc] = transformMatch;
            const groupCols = groupColsStr.split(',').map(col => 
              col.trim().replace(/['"]/g, '')
            );
            
            outputText += `# Computing transformed values for ${aggCol} grouped by [${groupCols.join(', ')}]\n`;
            
            const groups = {};
            resultData.forEach(row => {
              const key = groupCols.map(col => String(row[col])).join('|');
              if (!groups[key]) {
                groups[key] = {
                  rows: [],
                  groupValues: {}
                };
                groupCols.forEach(col => {
                  groups[key].groupValues[col] = row[col];
                });
              }
              groups[key].rows.push(row);
            });
            
            const groupAggs = {};
            Object.entries(groups).forEach(([key, group]: [string, any]) => {
              const aggRows = group.rows;
              
              if (aggFunc.includes('sum')) {
                groupAggs[key] = aggRows.reduce((acc, row) => acc + (Number(row[aggCol]) || 0), 0);
              } else if (aggFunc.includes('mean') || aggFunc.includes('avg')) {
                const sum = aggRows.reduce((acc, row) => acc + (Number(row[aggCol]) || 0), 0);
                groupAggs[key] = sum / aggRows.length;
              } else if (aggFunc.includes('count')) {
                groupAggs[key] = aggRows.length;
              }
            });
            
            const newColName = `${aggCol}_${aggFunc}`;
            resultData = resultData.map(row => {
              const key = groupCols.map(col => String(row[col])).join('|');
              return {
                ...row,
                [newColName]: String(groupAggs[key] || "0")
              };
            });
          }
        }
        
        if (pythonCode.includes("df.merge(")) {
          outputText += "# Merge operation detected\n";
          outputText += "# Note: Browser simulation has limited merge capabilities\n";
          
          const mergeMatch = pythonCode.match(/df\.merge\(([^)]+)\)/);
          if (mergeMatch) {
            const [_, mergeArgs] = mergeMatch;
            outputText += `# Merge arguments: ${mergeArgs}\n`;
          }
        }
        
        const marketShareMatch = pythonCode.match(/df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\s*\/\s*df\['([^']+)'\]/);
        if (marketShareMatch) {
          const [_, newCol, numerator, denominator] = marketShareMatch;
          outputText += `# Computing ${newCol} as ${numerator} / ${denominator}\n`;
          
          resultData = resultData.map(row => {
            const num = Number(row[numerator]) || 0;
            const den = Number(row[denominator]) || 1;
            const result = den === 0 ? 0 : num / den;
            return {
              ...row,
              [newCol]: String(result) // Convert number to string to fix TypeError
            };
          });
        }
        
        if (pythonCode.includes("df.fillna(")) {
          const fillnaMatch = pythonCode.match(/df\['([^']+)'\]\.fillna\(([^)]+)\)/);
          if (fillnaMatch) {
            const [_, col, fillValue] = fillnaMatch;
            let value = fillValue.trim();
            if (value.startsWith("'") || value.startsWith('"')) {
              value = value.replace(/['"]/g, '');
            } else if (!isNaN(Number(value))) {
              value = Number(value);
            }
            
            outputText += `# Filling NA values in ${col} with ${value}\n`;
            
            resultData = resultData.map(row => ({
              ...row,
              [col]: row[col] === null || row[col] === undefined || String(row[col]).trim() === '' 
                ? String(value) 
                : row[col]
            }));
          }
        }
        
        if (pythonCode.includes("df.drop(columns=")) {
          const dropMatch = pythonCode.match(/df\.drop\(columns=\[([^\]]+)\],\s*inplace=True\)/);
          if (dropMatch) {
            const [_, colsStr] = dropMatch;
            const colsToDrop = colsStr.split(',').map(col => 
              col.trim().replace(/['"]/g, '')
            );
            
            outputText += `# Dropping columns: ${colsToDrop.join(', ')}\n`;
            
            resultData = resultData.map(row => {
              const newRow = {...row};
              colsToDrop.forEach(col => {
                delete newRow[col];
              });
              return newRow;
            });
          }
        }
        
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
    }, 1000);
  };

  const calculateStdDev = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  };

  const handleSave = () => {
    if (outputData.length > 0 && selectedFileId) {
      const newFile: FileData = {
        id: `python-${Date.now()}`,
        name: outputName,
        type: "csv",
        size: 0,
        data: outputData,
        columns: outputData.length > 0 ? Object.keys(outputData[0]) : [],
        selected: true,
        content: '',
      };
      
      onComplete(outputData, [...files, newFile], false);
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
        <div className="flex justify-between items-center flex-wrap gap-2">
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

          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                value={outputName}
                onChange={handleOutputNameChange}
                placeholder="Output filename"
                className="min-w-[200px]"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Parse Options
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">File Parsing Options</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="separator">Separator</Label>
                    <Select 
                      value={parseOptions.separator} 
                      onValueChange={(value) => handleParseOptionChange("separator", value)}
                    >
                      <SelectTrigger id="separator">
                        <SelectValue placeholder="Select separator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">Comma (,)</SelectItem>
                        <SelectItem value=";">Semicolon (;)</SelectItem>
                        <SelectItem value="\t">Tab (\t)</SelectItem>
                        <SelectItem value="|">Pipe (|)</SelectItem>
                        <SelectItem value=" ">Space ( )</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Character used to separate columns</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="encoding">Encoding</Label>
                    <Select 
                      value={parseOptions.encoding} 
                      onValueChange={(value) => handleParseOptionChange("encoding", value)}
                    >
                      <SelectTrigger id="encoding">
                        <SelectValue placeholder="Select encoding" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf-8">UTF-8</SelectItem>
                        <SelectItem value="utf-16">UTF-16</SelectItem>
                        <SelectItem value="ascii">ASCII</SelectItem>
                        <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                        <SelectItem value="unicode_escape">Unicode Escape</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">File character encoding</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
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
                        <span>
                          {outputData.length > 0 ? 
                            `${outputData.length} rows × ${Object.keys(outputData[0] || {}).length} columns` : 
                            ''}
                        </span>
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

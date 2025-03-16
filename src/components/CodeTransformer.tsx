
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileData, detectColumnTypes } from "@/utils/fileUtils";
import DataTable from "./DataTable";
import { toast } from "sonner";
import { Code2, Play, Save, Eye } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface CodeTransformerProps {
  files: FileData[];
  onTransformComplete: (transformedData: any[], sourceFileId: string) => void;
}

const CodeTransformer: React.FC<CodeTransformerProps> = ({ files, onTransformComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default template code
  const defaultCode = `// Available functions:
// - filter(data, condition): Filter rows (e.g., filter(data, row => row.age > 30))
// - map(data, transform): Transform each row (e.g., map(data, row => ({ ...row, fullName: row.firstName + ' ' + row.lastName })))
// - sort(data, key, direction): Sort data (e.g., sort(data, 'age', 'asc'))
// - addColumn(data, name, valueFn): Add a new column (e.g., addColumn(data, 'isAdult', row => row.age >= 18 ? 'Yes' : 'No'))
// - calculateColumn(data, name, formula): Calculate values (e.g., calculateColumn(data, 'total', row => row.price * row.quantity))
// - renameColumn(data, oldName, newName): Rename a column
// - dropColumn(data, columnName): Remove a column
// - aggregate(data, groupBy, aggregations): Group and aggregate data
// - head(data, n): Show first n rows (e.g., head(data, 5))
// - tail(data, n): Show last n rows (e.g., tail(data, 5))
// - filterByList(data, column, values, exclude): Filter by a list of values
// - unique(data, column): Get unique values from a column
// - describe(data): Get summary statistics for numeric columns

// Example transformation:
let result = data;

// Show first 5 rows
result = head(result, 5);

// Filter rows where 'column1' > 25
result = filter(result, row => row.column1 > 25);

// Filter rows by list of values
result = filterByList(result, 'column1', [10, 20, 30], false); // Include rows where column1 is 10, 20, or 30
// result = filterByList(result, 'column1', [10, 20, 30], true); // Exclude rows where column1 is 10, 20, or 30

// Add a calculated column
result = map(result, row => ({
  ...row,
  newColumn: row.column1 * 2
}));

// Return the transformed data
return result;`;

  // Reset state when opening
  useEffect(() => {
    if (isOpen && files.length > 0) {
      if (!selectedFileId) {
        setSelectedFileId(files[0].id);
      }
      
      if (!code) {
        setCode(defaultCode);
      }
    }
  }, [isOpen, files, selectedFileId]);

  // Update preview data when file selection changes
  useEffect(() => {
    if (selectedFileId) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.data) {
        setPreviewData(file.data.slice(0, 100)); // Show only first 100 rows initially
      }
    }
  }, [selectedFileId, files]);

  const showHeadRows = () => {
    if (!selectedFileId) return;
    const file = files.find(f => f.id === selectedFileId);
    if (file && file.data) {
      setPreviewData(file.data.slice(0, 10));
      toast.success("Showing first 10 rows");
    }
  };

  const runCode = () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const file = files.find(f => f.id === selectedFileId);
      if (!file || !file.data) {
        throw new Error("File data not found");
      }
      
      // Create a safe execution environment
      const executionCode = `
        const data = ${JSON.stringify(file.data)};
        
        // Helper functions
        const filter = (data, conditionFn) => data.filter(conditionFn);
        const map = (data, transformFn) => data.map(transformFn);
        const sort = (data, key, direction = 'asc') => {
          return [...data].sort((a, b) => {
            if (direction.toLowerCase() === 'asc') {
              return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
            } else {
              return a[key] > b[key] ? -1 : a[key] < b[key] ? 1 : 0;
            }
          });
        };
        const addColumn = (data, name, valueFn) => {
          return data.map(row => ({ ...row, [name]: valueFn(row) }));
        };
        const calculateColumn = (data, name, formula) => {
          return data.map(row => ({ ...row, [name]: formula(row) }));
        };
        const renameColumn = (data, oldName, newName) => {
          return data.map(row => {
            const newRow = { ...row };
            newRow[newName] = newRow[oldName];
            delete newRow[oldName];
            return newRow;
          });
        };
        const dropColumn = (data, columnName) => {
          return data.map(row => {
            const newRow = { ...row };
            delete newRow[columnName];
            return newRow;
          });
        };
        const aggregate = (data, groupByFn, aggregations) => {
          const groups = {};
          data.forEach(row => {
            const key = groupByFn(row);
            if (!groups[key]) {
              groups[key] = { _rows: [] };
            }
            groups[key]._rows.push(row);
          });
          
          return Object.entries(groups).map(([key, group]) => {
            const result = { _groupKey: key };
            Object.entries(aggregations).forEach(([name, aggFn]) => {
              result[name] = aggFn(group._rows);
            });
            return result;
          });
        };
        
        // New helper functions
        const head = (data, n = 5) => data.slice(0, n);
        const tail = (data, n = 5) => data.slice(Math.max(data.length - n, 0));
        
        const filterByList = (data, column, values, exclude = false) => {
          return data.filter(row => {
            const valueExists = values.includes(row[column]);
            return exclude ? !valueExists : valueExists;
          });
        };
        
        const unique = (data, column) => {
          return [...new Set(data.map(row => row[column]))];
        };
        
        const describe = (data) => {
          const columns = Object.keys(data[0] || {});
          const result = {};
          
          columns.forEach(col => {
            const values = data.map(row => row[col]).filter(val => !isNaN(Number(val))).map(Number);
            if (values.length > 0) {
              const sum = values.reduce((a, b) => a + b, 0);
              const mean = sum / values.length;
              const min = Math.min(...values);
              const max = Math.max(...values);
              const sorted = [...values].sort((a, b) => a - b);
              const median = sorted.length % 2 === 0 
                ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 
                : sorted[Math.floor(sorted.length/2)];
              
              result[col] = { count: values.length, mean, min, max, median };
            }
          });
          
          return result;
        };
        
        // Execute user code
        (function() {
          ${code}
        })();
      `;
      
      // eslint-disable-next-line no-new-func
      const result = new Function(executionCode)();
      
      if (Array.isArray(result)) {
        setPreviewData(result);
        toast.success("Code executed successfully");
      } else if (typeof result === 'object' && result !== null) {
        // Handle the case of stats/describe output
        console.log("Non-array result:", result);
        toast.success("Code executed successfully - showing stats");
        
        // Convert stats object to rows for display
        const statsRows = [];
        for (const [col, stats] of Object.entries(result)) {
          if (typeof stats === 'object') {
            for (const [stat, value] of Object.entries(stats as object)) {
              statsRows.push({
                column: col,
                statistic: stat,
                value: value
              });
            }
          }
        }
        
        if (statsRows.length > 0) {
          setPreviewData(statsRows);
        } else {
          throw new Error("Code must return an array of objects or statistics");
        }
      } else {
        throw new Error("Code must return an array of objects");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      toast.error(`Error executing code: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (previewData.length > 0 && selectedFileId) {
      onTransformComplete(previewData, selectedFileId);
      setIsOpen(false);
      toast.success("Transformation saved");
    } else {
      toast.error("No data to save");
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
        disabled={files.length === 0}
      >
        <Code2 className="h-4 w-4" />
        Transform with Code
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Transform Data with Code</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <Select value={selectedFileId} onValueChange={setSelectedFileId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a file" />
              </SelectTrigger>
              <SelectContent>
                {files.map(file => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={showHeadRows}
                disabled={!selectedFileId}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View First 10 Rows
              </Button>
              
              <Button 
                variant="secondary"
                size="sm"
                onClick={runCode}
                disabled={isProcessing || !selectedFileId}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Run Code
              </Button>
              
              <Button 
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isProcessing || previewData.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Transformation
              </Button>
            </div>
          </div>
          
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 overflow-hidden rounded-lg border"
          >
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full flex flex-col">
                <div className="bg-muted p-2 text-sm font-medium">Code Editor</div>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 font-mono text-sm p-4 border-0 resize-none focus-visible:ring-0 rounded-none"
                  placeholder="Write your transformation code here..."
                />
                {error && (
                  <div className="bg-destructive/10 text-destructive p-2 text-sm overflow-auto max-h-[100px]">
                    {error}
                  </div>
                )}
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={60}>
              <div className="h-full flex flex-col">
                <div className="bg-muted p-2 text-sm font-medium">
                  Preview ({previewData.length} rows)
                </div>
                <div className="flex-1 overflow-auto p-1">
                  <DataTable 
                    data={previewData} 
                    maxHeight="calc(100% - 10px)"
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CodeTransformer;

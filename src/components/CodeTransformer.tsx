
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileData, detectColumnTypes } from "@/utils/fileUtils";
import DataTable from "./DataTable";
import { toast } from "sonner";
import { Code2, Play, Save } from "lucide-react";
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

// Example transformation:
let result = data;

// Filter rows where 'age' > 25
result = result.filter(row => row.column1 > 25);

// Add a calculated column
result = result.map(row => ({
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
        setPreviewData(file.data);
      }
    }
  }, [selectedFileId, files]);

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

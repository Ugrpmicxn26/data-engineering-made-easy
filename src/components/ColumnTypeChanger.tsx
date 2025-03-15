import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileData, detectColumnTypes, ColumnInfo } from "@/utils/fileUtils";
import DataTable from "./DataTable";
import { toast } from "sonner";
import { Type, Save, Table2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ColumnTypeChangerProps {
  files: FileData[];
  onTypeChangeComplete: (transformedData: any[], sourceFileId: string) => void;
}

type DataType = 'text' | 'integer' | 'decimal' | 'date' | 'boolean';

interface ColumnTypeConfig {
  column: string;
  originalType: string;
  newType: DataType;
}

const ColumnTypeChanger: React.FC<ColumnTypeChangerProps> = ({ files, onTypeChangeComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnInfo>>({});
  const [typeChanges, setTypeChanges] = useState<ColumnTypeConfig[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen && files.length > 0) {
      if (!selectedFileId) {
        setSelectedFileId(files[0].id);
      }
    }
  }, [isOpen, files, selectedFileId]);

  // Update selected file and analyze columns when file selection changes
  useEffect(() => {
    if (selectedFileId) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.data) {
        setSelectedFile(file);
        setPreviewData(file.data);
        
        // Detect column types
        const detectedTypes = detectColumnTypes(file.data);
        setColumnTypes(detectedTypes);
        
        // Reset type changes
        setTypeChanges([]);
      }
    }
  }, [selectedFileId, files]);

  const handleTypeChange = (column: string, newType: DataType) => {
    const currentType = columnTypes[column]?.type || 'text';
    
    // Update or add the type change
    setTypeChanges(prev => {
      const existingChange = prev.find(tc => tc.column === column);
      
      if (existingChange) {
        // If changing back to original type, remove the change
        if (newType === existingChange.originalType) {
          return prev.filter(tc => tc.column !== column);
        }
        
        // Otherwise update the change
        return prev.map(tc => 
          tc.column === column 
            ? { ...tc, newType } 
            : tc
        );
      } else {
        // Add new change
        return [...prev, { 
          column, 
          originalType: currentType, 
          newType 
        }];
      }
    });
  };

  const convertValue = (value: any, type: DataType): any => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    try {
      switch (type) {
        case 'text':
          return String(value);
        case 'integer':
          const intVal = parseInt(value, 10);
          return isNaN(intVal) ? null : intVal;
        case 'decimal':
          const floatVal = parseFloat(value);
          return isNaN(floatVal) ? null : floatVal;
        case 'date':
          const dateVal = new Date(value);
          return isNaN(dateVal.getTime()) ? null : dateVal.toISOString().split('T')[0];
        case 'boolean':
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lowered = value.toLowerCase();
            if (['true', 'yes', '1', 'y'].includes(lowered)) return true;
            if (['false', 'no', '0', 'n'].includes(lowered)) return false;
          }
          if (typeof value === 'number') return value !== 0;
          return null;
        default:
          return value;
      }
    } catch (error) {
      return null;
    }
  };

  const applyTypeChanges = () => {
    if (!selectedFile || typeChanges.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Create a copy of the data
      const transformedData = selectedFile.data.map(row => ({ ...row }));
      
      // Apply each type change
      typeChanges.forEach(change => {
        transformedData.forEach(row => {
          row[change.column] = convertValue(row[change.column], change.newType);
        });
      });
      
      setPreviewData(transformedData);
      toast.success("Type changes applied to preview");
    } catch (error) {
      toast.error(`Error applying type changes: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (previewData.length > 0 && selectedFileId) {
      onTypeChangeComplete(previewData, selectedFileId);
      setIsOpen(false);
      toast.success("Data type changes saved");
    } else {
      toast.error("No data to save");
    }
  };

  const getTypeColorClass = (type: string) => {
    switch (type) {
      case 'integer':
      case 'decimal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'date':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'boolean':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
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
        <Type className="h-4 w-4" />
        Change Column Types
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Change Column Data Types</DialogTitle>
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
                onClick={applyTypeChanges}
                disabled={isProcessing || typeChanges.length === 0}
                className="flex items-center gap-2"
              >
                <Table2 className="h-4 w-4" />
                Apply Changes to Preview
              </Button>
              
              <Button 
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isProcessing || typeChanges.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4 flex-1 overflow-hidden">
            {/* Column type selection panel */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted p-2 text-sm font-medium">
                Column Types
              </div>
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-1/3">Column</TableHead>
                      <TableHead className="w-1/3">Detected Type</TableHead>
                      <TableHead className="w-1/3">New Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(columnTypes).map(([column, info]) => {
                      const change = typeChanges.find(tc => tc.column === column);
                      return (
                        <TableRow key={column}>
                          <TableCell className="font-medium truncate max-w-[120px]">
                            {column}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTypeColorClass(info.type)}>
                              {info.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={change?.newType || info.type} 
                              onValueChange={(value) => handleTypeChange(column, value as DataType)}
                            >
                              <SelectTrigger className="w-full h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="integer">Integer</SelectItem>
                                <SelectItem value="decimal">Decimal</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Data preview panel */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted p-2 text-sm font-medium">
                Data Preview ({typeChanges.length > 0 ? "with type changes" : "original data"})
              </div>
              <div className="flex-1 overflow-auto p-1">
                <DataTable 
                  data={previewData} 
                  maxHeight="calc(100% - 10px)"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ColumnTypeChanger;

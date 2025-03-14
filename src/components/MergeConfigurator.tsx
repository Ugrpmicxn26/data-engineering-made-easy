
import React, { useState, useMemo } from "react";
import { FileData, MergeOptions, mergeDatasets } from "@/utils/fileUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Layers, MergeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MergeConfiguratorProps {
  files: FileData[];
  onMergeComplete: (data: any[]) => void;
}

const MergeConfigurator: React.FC<MergeConfiguratorProps> = ({ files, onMergeComplete }) => {
  const [keyColumns, setKeyColumns] = useState<Record<string, string>>({});
  const [includeColumns, setIncludeColumns] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Get only selected files
  const selectedFiles = useMemo(() => files.filter(file => file.selected), [files]);

  // Initialize keyColumns and includeColumns when selected files change
  React.useEffect(() => {
    const newKeyColumns: Record<string, string> = {};
    const newIncludeColumns: Record<string, string[]> = {};

    selectedFiles.forEach(file => {
      // If there's no key column selected yet, default to the first column
      if (!keyColumns[file.id] && file.columns.length > 0) {
        newKeyColumns[file.id] = file.columns[0];
      } else if (keyColumns[file.id]) {
        newKeyColumns[file.id] = keyColumns[file.id];
      }

      // Default to including all columns
      if (!includeColumns[file.id]) {
        newIncludeColumns[file.id] = [...file.columns];
      } else {
        newIncludeColumns[file.id] = includeColumns[file.id];
      }
    });

    setKeyColumns(prev => ({ ...prev, ...newKeyColumns }));
    setIncludeColumns(prev => ({ ...prev, ...newIncludeColumns }));
  }, [selectedFiles, keyColumns, includeColumns]);

  const handleKeyColumnChange = (fileId: string, value: string) => {
    setKeyColumns(prev => ({ ...prev, [fileId]: value }));
  };

  const handleToggleColumn = (fileId: string, column: string) => {
    setIncludeColumns(prev => {
      const currentColumns = prev[fileId] || [];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter(col => col !== column)
        : [...currentColumns, column];
      return { ...prev, [fileId]: newColumns };
    });
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare datasets for merging
      const datasets: Record<string, any[]> = {};
      selectedFiles.forEach(file => {
        if (file.data) {
          datasets[file.id] = file.data;
        }
      });

      // Merge the datasets
      const mergedData = mergeDatasets(datasets, keyColumns, includeColumns);
      onMergeComplete(mergedData);
    } catch (error) {
      console.error("Error merging datasets:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedFiles.length < 2) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg animate-fade-in">
        <MergeIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
        <h3 className="font-medium text-lg mb-1">Select Files to Merge</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Please select at least two files from the list above to start configuring the merge options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Configure Merge Options</h2>
        <p className="text-sm text-muted-foreground">
          Select which columns to use as keys for matching records across files
        </p>
      </div>

      <Tabs defaultValue="keyColumns" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="keyColumns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Key Columns
          </TabsTrigger>
          <TabsTrigger value="selectColumns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Select Columns
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="keyColumns" className="space-y-4">
          {selectedFiles.map(file => (
            <div key={file.id} className="p-4 bg-card rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-sm">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {file.columns.length} columns • {file.data?.length || 0} rows
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Key column:</span>
                  <Select
                    value={keyColumns[file.id] || ""}
                    onValueChange={(value) => handleKeyColumnChange(file.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {file.columns.map(column => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="selectColumns" className="space-y-4">
          {selectedFiles.map(file => (
            <div key={file.id} className="p-4 bg-card rounded-lg border">
              <div className="mb-3">
                <h3 className="font-medium text-sm">{file.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Select columns to include in the merged output
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {file.columns.map(column => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${file.id}-${column}`}
                      checked={(includeColumns[file.id] || []).includes(column)}
                      onCheckedChange={() => handleToggleColumn(file.id, column)}
                    />
                    <label
                      htmlFor={`${file.id}-${column}`}
                      className="text-sm truncate cursor-pointer"
                    >
                      {column}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center mt-6">
        <Button
          onClick={handleMerge}
          disabled={selectedFiles.length < 2 || isProcessing}
          className="hover-scale"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Merging...
            </>
          ) : (
            <>
              <Layers className="mr-2 h-4 w-4" />
              Merge Selected Files
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MergeConfigurator;

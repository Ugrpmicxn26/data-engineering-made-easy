
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, PlusCircle, MinusCircle } from "lucide-react";
import { FileData } from "@/utils/fileUtils";
import { SelectWithSearch } from "@/components/ui/select-with-search";
import { ensureArray } from "@/utils/type-correction";

interface FileCardProps {
  file: FileData;
  keyColumns: string[];
  includeColumns: string[];
  onAddKeyColumn: () => void;
  onRemoveKeyColumn: (index: number) => void;
  onKeyColumnChange: (index: number, value: string) => void;
  onToggleColumn: (column: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({
  file,
  keyColumns,
  includeColumns,
  onAddKeyColumn,
  onRemoveKeyColumn,
  onKeyColumnChange,
  onToggleColumn,
}) => {
  // Ensure file and columns are valid with null/undefined checks
  const safeFile = file || { columns: [], id: '', name: '', data: [], type: '', size: 0, selected: false, content: '' };
  const safeColumns = ensureArray<string>(safeFile.columns || []);
  const safeIncludeColumns = ensureArray<string>(includeColumns || []);
  const safeKeyColumns = ensureArray<string>(keyColumns || []);
  
  // Convert columns to options format for SelectWithSearch with safety
  const columnOptions = React.useMemo(() => 
    safeColumns
      .filter(column => column !== null && column !== undefined)
      .map(column => ({
        value: String(column),
        label: String(column)
      })
    ), 
    [safeColumns]
  );

  return (
    <div className="p-4 bg-card rounded-lg border">
      <div className="mb-3">
        <h3 className="font-medium text-sm">{safeFile.name}</h3>
        <p className="text-xs text-muted-foreground">
          {safeColumns.length} columns • {Array.isArray(safeFile.data) ? safeFile.data.length : 0} rows
        </p>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center">
          <Key className="h-3.5 w-3.5 mr-1.5" />
          Key Columns
        </h4>
        
        {safeKeyColumns.map((column, index) => (
          <div key={index} className="flex items-center gap-2">
            <SelectWithSearch
              value={column}
              onValueChange={(value) => onKeyColumnChange(index, value)}
              options={columnOptions}
              placeholder="Select a column"
              triggerClassName="w-[180px]"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onRemoveKeyColumn(index)}
              disabled={safeKeyColumns.length <= 1}
            >
              <MinusCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddKeyColumn}
          disabled={safeKeyColumns.length === safeColumns.length}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-3.5 w-3.5" />
          Add Key Column
        </Button>
      </div>
      
      <div className="mt-4">
        <Tabs defaultValue="include" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="include" className="flex-1">Include Columns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="include" className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {safeColumns.map(column => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${safeFile.id}-${column}`}
                    checked={safeIncludeColumns.includes(column)}
                    onCheckedChange={() => onToggleColumn(column)}
                  />
                  <label
                    htmlFor={`${safeFile.id}-${column}`}
                    className="text-sm truncate cursor-pointer"
                  >
                    {column}
                  </label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FileCard;

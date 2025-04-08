
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, PlusCircle, MinusCircle } from "lucide-react";
import { FileData } from "@/utils/fileUtils";

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
  return (
    <div className="p-4 bg-card rounded-lg border">
      <div className="mb-3">
        <h3 className="font-medium text-sm">{file.name}</h3>
        <p className="text-xs text-muted-foreground">
          {file.columns.length} columns • {file.data?.length || 0} rows
        </p>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center">
          <Key className="h-3.5 w-3.5 mr-1.5" />
          Key Columns
        </h4>
        
        {keyColumns.map((column, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={column}
              onValueChange={(value) => onKeyColumnChange(index, value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {file.columns.map(col => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onRemoveKeyColumn(index)}
              disabled={keyColumns.length <= 1}
            >
              <MinusCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddKeyColumn}
          disabled={keyColumns.length === file.columns.length}
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
              {file.columns.map(column => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${file.id}-${column}`}
                    checked={includeColumns.includes(column)}
                    onCheckedChange={() => onToggleColumn(column)}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FileCard;

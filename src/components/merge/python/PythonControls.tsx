
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { FileData, ParseOptions } from "@/utils/fileUtils";
import { Play, Save, Settings } from "lucide-react";

interface PythonControlsProps {
  selectedFiles: FileData[];
  selectedFileId: string;
  setSelectedFileId: (fileId: string) => void;
  outputName: string;
  handleOutputNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  parseOptions: ParseOptions;
  handleParseOptionChange: (option: keyof ParseOptions, value: string) => void;
  handleExecutePython: () => void;
  handleSave: () => void;
  loading: boolean;
  outputData: any[];
}

const PythonControls: React.FC<PythonControlsProps> = ({
  selectedFiles,
  selectedFileId,
  setSelectedFileId,
  outputName,
  handleOutputNameChange,
  parseOptions,
  handleParseOptionChange,
  handleExecutePython,
  handleSave,
  loading,
  outputData,
}) => {
  return (
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
          className="flex items-center gap-2"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full"></div>
          ) : (
            <Play className="h-4 w-4" />
          )}
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
  );
};

export default PythonControls;

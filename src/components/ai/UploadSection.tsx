
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileData } from "@/utils/fileUtils";
import { Database, XCircle, Search } from "lucide-react";
import AIFileUploader from "@/components/ai/AIFileUploader";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UploadSectionProps {
  files: FileData[];
  onFilesProcessed: (newFiles: FileData[]) => void;
  onRemoveFile: (fileId: string) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({
  files,
  onFilesProcessed,
  onRemoveFile
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredFiles = searchTerm
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.columns.some(col => col.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : files;

  return (
    <div className="flex-1 overflow-auto mt-0 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Data Files</CardTitle>
            <CardDescription>
              Upload CSV, JSON, or Excel files for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AIFileUploader onFilesProcessed={onFilesProcessed} />
          </CardContent>
        </Card>
        
        {files.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Available Files</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search files or columns..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredFiles.length > 0 ? (
                  filteredFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.data.length} rows, {file.columns.length} columns
                          </p>
                          
                          {/* Show a preview of column names */}
                          <div className="flex flex-wrap gap-1 mt-1 max-w-[400px]">
                            {file.columns.slice(0, 3).map(col => (
                              <TooltipProvider key={col}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block px-1.5 py-0.5 bg-muted rounded text-xs">
                                      {col}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{col}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                            {file.columns.length > 3 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block px-1.5 py-0.5 bg-muted rounded text-xs">
                                      +{file.columns.length - 3} more
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="max-w-[300px]">
                                      <p className="font-medium mb-1">All columns:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {file.columns.map(col => (
                                          <span key={col} className="inline-block px-1.5 py-0.5 bg-muted rounded text-xs">
                                            {col}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveFile(file.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No files match your search
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UploadSection;

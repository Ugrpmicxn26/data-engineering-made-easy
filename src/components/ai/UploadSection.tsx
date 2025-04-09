
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileData } from "@/utils/fileUtils";
import { Database, XCircle } from "lucide-react";
import AIFileUploader from "@/components/ai/AIFileUploader";
import ChartGenerator from "@/components/ai/ChartGenerator";

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
          <>
            <Card>
              <CardHeader>
                <CardTitle>Available Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.data.length} rows, {file.columns.length} columns
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveFile(file.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <ChartGenerator files={files} />
          </>
        )}
      </div>
    </div>
  );
};

export default UploadSection;

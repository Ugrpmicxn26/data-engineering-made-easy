
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileData } from "@/utils/fileUtils";
import { Database, XCircle, UploadCloud } from "lucide-react";
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
        <Card className="shadow-md border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
            <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Upload Data Files</CardTitle>
            <CardDescription>
              Upload CSV, JSON, or Excel files for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AIFileUploader onFilesProcessed={onFilesProcessed} />
          </CardContent>
        </Card>
        
        {files.length > 0 ? (
          <>
            <Card className="shadow-md border-slate-200 dark:border-slate-800">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
                <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Available Files</CardTitle>
                <CardDescription>
                  Files ready for analysis and visualization
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.columns.length} columns
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveFile(file.id)} className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <ChartGenerator files={files} />
          </>
        ) : (
          <div className="text-center p-12 border rounded-lg border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Files Uploaded</h3>
            <p className="text-muted-foreground mb-4">
              Upload your data files to start creating visualizations and gain insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadSection;


import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { FileData, extractZipFiles, parseCSV, readFileAsText } from "@/utils/fileUtils";
import { Upload, FileIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface AIFileUploaderProps {
  onFilesProcessed: (files: FileData[]) => void;
}

const AIFileUploader: React.FC<AIFileUploaderProps> = ({ onFilesProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      setIsProcessing(true);
      setProcessingProgress(0);
      setUploadComplete(false);
      
      const processedFiles: FileData[] = [];
      const filePromises: Promise<void>[] = [];
      const totalFiles = files.length;
      let processedCount = 0;

      for (const file of files) {
        const promise = (async () => {
          try {
            // Process ZIP files
            if (file.name.toLowerCase().endsWith(".zip")) {
              const extractedFiles = await extractZipFiles(file);
              if (extractedFiles.length === 0) {
                toast.warning(`No CSV files found in ${file.name}`);
              }
              // Process each extracted CSV or TXT file
              for (const extractedFile of extractedFiles) {
                const content = await readFileAsText(extractedFile);
                const fileType = extractedFile.name.toLowerCase().endsWith(".txt") ? "txt" : "csv";
                
                // Set specific parameters for TXT files as required
                const separator = fileType === "txt" ? "\t" : ",";
                const encoding = fileType === "txt" ? "unicode_escape" : "utf-8";
                
                // Parse with proper parameters
                const { data, columns } = await parseCSV(content, { 
                  separator, 
                  encoding,
                  // Force string type for all columns in TXT files
                  forceStringType: fileType === "txt"
                });
                
                processedFiles.push({
                  id: `${extractedFile.name}-${Date.now()}`,
                  name: extractedFile.name,
                  type: fileType,
                  size: extractedFile.size,
                  content,
                  data,
                  columns,
                  selected: false,
                });
              }
            }
            // Process CSV and TXT files
            else if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
              const content = await readFileAsText(file);
              const fileType = file.name.toLowerCase().endsWith(".txt") ? "txt" : "csv";
              
              // Set specific parameters for TXT files as required
              const separator = fileType === "txt" ? "\t" : ",";
              const encoding = fileType === "txt" ? "unicode_escape" : "utf-8";
              
              // Parse with proper parameters
              const { data, columns } = await parseCSV(content, { 
                separator, 
                encoding,
                // Force string type for all columns in TXT files
                forceStringType: fileType === "txt"
              });
              
              processedFiles.push({
                id: `${file.name}-${Date.now()}`,
                name: file.name,
                type: fileType,
                size: file.size,
                content,
                data,
                columns,
                selected: false,
              });
            } else {
              toast.error(`Unsupported file type: ${file.name}`);
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            toast.error(`Failed to process ${file.name}`);
          } finally {
            processedCount++;
            setProcessingProgress(Math.floor((processedCount / totalFiles) * 100));
          }
        })();

        filePromises.push(promise);
      }

      await Promise.all(filePromises);
      
      // Wait a moment to show 100% progress
      setProcessingProgress(100);
      setTimeout(() => {
        onFilesProcessed(processedFiles);
        setIsProcessing(false);
        setUploadComplete(processedFiles.length > 0);
        
        if (processedFiles.length > 0) {
          toast.success(`Successfully processed ${processedFiles.length} files`);
        }
      }, 500);
    },
    [onFilesProcessed]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer.files.length > 0) {
        const fileList = Array.from(e.dataTransfer.files);
        processFiles(fileList);
      }
    },
    [processFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const fileList = Array.from(e.target.files);
        processFiles(fileList);
      }
    },
    [processFiles]
  );

  const handleReset = useCallback(() => {
    setUploadComplete(false);
  }, []);

  return (
    <div
      className={cn(
        "file-drop-area border-2 border-dashed rounded-lg p-8 transition-all",
        isDragging ? "border-primary bg-primary/5" : "border-border/50",
        "flex flex-col items-center justify-center"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isProcessing ? (
        <div className="text-center w-full max-w-md">
          <div className="mb-4">
            <Progress value={processingProgress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">Processing files... {processingProgress}%</p>
          </div>
          <p className="text-sm text-muted-foreground">This may take a moment depending on file size</p>
        </div>
      ) : uploadComplete ? (
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">Files uploaded successfully!</h3>
          <p className="text-muted-foreground mb-4">Your files are ready for AI analysis</p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={handleReset}
              className="border-border/50"
            >
              Upload more files
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => document.querySelector('[data-value="chat"]')?.dispatchEvent(new MouseEvent('click'))}
            >
              Go to Chat
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-primary/10 p-5 rounded-full mb-4">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">Upload files for AI analysis</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Drag and drop ZIP, CSV, or TXT files, or click to select
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mt-2 max-w-md text-sm">
            <div className="flex items-center px-3 py-1 bg-secondary rounded-full">
              <FileIcon className="w-3 h-3 mr-1 text-primary" />
              <span>.csv</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-secondary rounded-full">
              <FileIcon className="w-3 h-3 mr-1 text-primary" />
              <span>.txt</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-secondary rounded-full">
              <FileIcon className="w-3 h-3 mr-1 text-primary" />
              <span>.zip (containing CSV files)</span>
            </div>
          </div>
          
          <div className="mt-6">
            <label
              htmlFor="ai-file-upload"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-colors cursor-pointer hover:scale-105 transform duration-200"
            >
              <span>Select Files</span>
              <input
                id="ai-file-upload"
                type="file"
                className="sr-only"
                multiple
                accept=".csv,.zip,.txt"
                onChange={handleFileInputChange}
              />
            </label>
          </div>
          
          <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>File contents are processed locally in your browser</span>
          </div>
        </>
      )}
    </div>
  );
};

export default AIFileUploader;

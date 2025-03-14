
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { FileData, extractZipFiles, parseCSV, readFileAsText } from "@/utils/fileUtils";
import { Upload, X, FileIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFilesProcessed: (files: FileData[]) => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ onFilesProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      setIsProcessing(true);
      const processedFiles: FileData[] = [];
      const filePromises: Promise<void>[] = [];

      for (const file of files) {
        const promise = (async () => {
          try {
            // Process ZIP files
            if (file.name.toLowerCase().endsWith(".zip")) {
              const extractedFiles = await extractZipFiles(file);
              if (extractedFiles.length === 0) {
                toast.warning(`No CSV files found in ${file.name}`);
              }
              // Process each extracted CSV file
              for (const extractedFile of extractedFiles) {
                const content = await readFileAsText(extractedFile);
                const { data, columns } = await parseCSV(content);
                processedFiles.push({
                  id: `${extractedFile.name}-${Date.now()}`,
                  name: extractedFile.name,
                  type: extractedFile.type,
                  size: extractedFile.size,
                  content,
                  data,
                  columns,
                  selected: false,
                });
              }
            }
            // Process CSV files
            else if (file.name.toLowerCase().endsWith(".csv")) {
              const content = await readFileAsText(file);
              const { data, columns } = await parseCSV(content);
              processedFiles.push({
                id: `${file.name}-${Date.now()}`,
                name: file.name,
                type: file.type,
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
          }
        })();

        filePromises.push(promise);
      }

      await Promise.all(filePromises);
      onFilesProcessed(processedFiles);
      setIsProcessing(false);
      
      if (processedFiles.length > 0) {
        toast.success(`Successfully processed ${processedFiles.length} files`);
      }
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

  return (
    <div
      className={cn(
        "file-drop-area flex flex-col items-center justify-center animate-fade-in",
        isDragging && "active"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isProcessing ? (
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Processing files...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a moment depending on file size</p>
        </div>
      ) : (
        <>
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">Drop files here</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Drag and drop ZIP or CSV files, or click to select
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mt-2 max-w-md text-sm">
            <div className="flex items-center px-3 py-1 bg-secondary rounded-full">
              <FileIcon className="w-3 h-3 mr-1 text-primary" />
              <span>.csv</span>
            </div>
            <div className="flex items-center px-3 py-1 bg-secondary rounded-full">
              <FileIcon className="w-3 h-3 mr-1 text-primary" />
              <span>.zip (containing CSV files)</span>
            </div>
          </div>
          
          <div className="mt-6">
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer hover-scale"
            >
              <span>Select Files</span>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                multiple
                accept=".csv,.zip"
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

export default FileDropZone;

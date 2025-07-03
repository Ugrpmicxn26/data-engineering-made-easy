
import React from "react";
import { FileData, formatFileSize } from "@/utils/fileUtils";
import { CheckCircle, XCircle, Eye, FileIcon, FileSpreadsheet } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FileListProps {
  files: FileData[];
  onToggleSelect: (fileId: string) => void;
  onPreview: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onToggleSelect, onPreview, onRemove }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="w-full animate-slide-up">
      <h2 className="text-lg font-medium mb-3">Uploaded Files</h2>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "group flex items-center justify-between p-3 rounded-lg transition-all",
              "bg-card border hover:border-primary/50",
              file.selected && "ring-1 ring-primary border-primary/50"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Checkbox
                  checked={file.selected}
                  onCheckedChange={() => onToggleSelect(file.id)}
                  id={`file-${file.id}`}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>

              <div className="bg-primary/10 p-2 rounded">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>

              <div className="flex flex-col min-w-0">
                <label
                  htmlFor={`file-${file.id}`}
                  className="font-medium text-sm truncate max-w-[200px] sm:max-w-sm cursor-pointer"
                >
                  {file.name}
                </label>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="mx-1">•</span>
                  <span>{file.columns.length} columns</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => onPreview(file.id)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
                title="Preview file"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRemove(file.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                title="Remove file"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;

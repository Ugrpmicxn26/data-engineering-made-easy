
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileData } from "@/utils/fileUtils";
import DataTable from "./DataTable";
import { X } from "lucide-react";
import { ensureArray } from "@/utils/type-correction";
import { superSafeToArray } from "@/utils/iterableUtils";

interface FilePreviewModalProps {
  file: FileData | null;
  isOpen: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  if (!file) return null;

  // Multiple layers of defense for ensuring file data is an array
  const safeData = React.useMemo(() => {
    if (!file || !file.data) return [];
    
    // First try with superSafeToArray for maximum safety
    const result = superSafeToArray(file.data);
    
    // If that fails, try with ensureArray as backup
    if (!result || result.length === 0) {
      return ensureArray(file.data);
    }
    
    return result;
  }, [file]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Preview: {file.name}</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden">
          <DataTable 
            data={safeData} 
            filename={file.name}
            maxHeight="60vh"
          />
        </div>
        
        <DialogFooter className="flex-shrink-0 sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;

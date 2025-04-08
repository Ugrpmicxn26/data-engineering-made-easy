
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
import { superSafeToArray, isSafelyIterable, makeSafelyIterable } from "@/utils/iterableUtils";

interface FilePreviewModalProps {
  file: FileData | null;
  isOpen: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  if (!file) return null;

  // Multiple layers of defense for ensuring file data is an array
  const safeData = React.useMemo(() => {
    // Early safety check
    if (!file || !file.data) {
      console.warn("FilePreviewModal: Missing file data");
      return [];
    }
    
    // Check if data is iterable first
    if (!isSafelyIterable(file.data)) {
      console.warn("FilePreviewModal: Non-iterable data received:", file.data);
      return [];
    }
    
    // Use multiple methods to convert to array with fallbacks
    try {
      // First try with superSafeToArray for maximum safety
      const result = superSafeToArray(file.data);
      
      // If that fails, try with ensureArray as backup
      if (!result || result.length === 0) {
        try {
          const backupResult = ensureArray(file.data);
          
          // If backupResult is also empty, create a safe empty array
          if (!backupResult || backupResult.length === 0) {
            console.warn("Both array conversion methods failed in FilePreviewModal for:", file.data);
            return [];
          }
          
          return backupResult;
        } catch (e) {
          console.error("Error in FilePreviewModal backup conversion:", e);
          return [];
        }
      }
      
      return result;
    } catch (e) {
      console.error("Critical error in FilePreviewModal preparing data:", e);
      return [];
    }
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


import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileData } from "@/utils/fileUtils";
import { dataStorage } from "@/utils/dataStorage";
import DataTable from "./DataTable";
import { X } from "lucide-react";

interface FilePreviewModalProps {
  file: FileData | null;
  isOpen: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      setLoading(true);
      dataStorage.getSampleData(file.id, 100).then(data => {
        setPreviewData(data);
        setLoading(false);
      }).catch(() => {
        setPreviewData([]);
        setLoading(false);
      });
    }
  }, [file, isOpen]);

  if (!file) return null;

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
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <DataTable 
              data={previewData} 
              filename={file.name}
              maxHeight="60vh"
            />
          )}
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

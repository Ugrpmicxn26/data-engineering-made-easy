
import React from "react";
import DataTable from "@/components/DataTable";
import { ensureArray } from "@/utils/type-correction";
import { superSafeToArray, isSafelyIterable } from "@/utils/iterableUtils";

interface PythonDataPreviewProps {
  outputData: any[];
}

const PythonDataPreview: React.FC<PythonDataPreviewProps> = ({ outputData }) => {
  // Multiple safeguards to ensure we always have a valid array
  const safeOutputData = React.useMemo(() => {
    // First check if data is iterable at all
    if (!isSafelyIterable(outputData)) {
      console.warn("PythonDataPreview received non-iterable data:", outputData);
      return [];
    }
    
    // Try with superSafeToArray for maximum safety
    const result = superSafeToArray(outputData);
    
    // If that fails, try with ensureArray as backup
    if (!result || result.length === 0) {
      const backupResult = ensureArray(outputData || []);
      if (!backupResult || backupResult.length === 0) {
        console.warn("Both array conversion methods failed on outputData:", outputData);
        return [];
      }
      return backupResult;
    }
    
    return result;
  }, [outputData]);
  
  // Get columns count safely
  const columnsCount = React.useMemo(() => {
    if (!safeOutputData || safeOutputData.length === 0) return 0;
    if (safeOutputData[0] === null || typeof safeOutputData[0] !== 'object') return 0;
    
    try {
      return Object.keys(safeOutputData[0] || {}).length;
    } catch (e) {
      console.warn("Error getting columns count:", e);
      return 0;
    }
  }, [safeOutputData]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-muted p-2 text-xs flex items-center justify-between">
        <span>DataFrame Preview</span>
        <span>
          {safeOutputData.length} rows × {columnsCount} columns
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <DataTable 
          data={safeOutputData} 
          maxHeight="100%"
        />
      </div>
    </div>
  );
};

export default PythonDataPreview;

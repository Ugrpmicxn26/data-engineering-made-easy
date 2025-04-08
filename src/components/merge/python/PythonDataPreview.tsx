
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
    // Handle null/undefined case first
    if (outputData === null || outputData === undefined) {
      console.warn("PythonDataPreview received null/undefined data");
      return [];
    }
    
    // First check if data is iterable at all
    if (!isSafelyIterable(outputData)) {
      console.warn("PythonDataPreview received non-iterable data:", outputData);
      return [];
    }
    
    // Additional protection - if outputData is a primitive string, wrap it
    if (typeof outputData === 'string') {
      return [{ value: outputData }];
    }
    
    // Try with superSafeToArray for maximum safety
    try {
      const result = superSafeToArray(outputData);
      
      // If that fails, try with ensureArray as backup
      if (!result || result.length === 0) {
        try {
          const backupResult = ensureArray(outputData || []);
          if (!backupResult || backupResult.length === 0) {
            console.warn("Both array conversion methods failed on outputData:", outputData);
            return [];
          }
          return backupResult;
        } catch (e) {
          console.error("All array conversion methods failed:", e);
          return [];
        }
      }
      
      return result;
    } catch (e) {
      console.error("Critical error in PythonDataPreview data conversion:", e);
      return [];
    }
  }, [outputData]);
  
  // Get columns count safely with multiple fallbacks
  const columnsCount = React.useMemo(() => {
    if (!safeOutputData || safeOutputData.length === 0) return 0;
    
    try {
      const firstRow = safeOutputData[0];
      if (firstRow === null || typeof firstRow !== 'object') return 0;
      
      if (Array.isArray(firstRow)) {
        return firstRow.length;
      }
      
      return Object.keys(firstRow || {}).length;
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

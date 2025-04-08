
import React from "react";
import DataTable from "@/components/DataTable";

interface PythonDataPreviewProps {
  outputData: any[];
}

const PythonDataPreview: React.FC<PythonDataPreviewProps> = ({ outputData = [] }) => {
  // Ensure outputData is always an array
  const safeOutputData = Array.isArray(outputData) ? outputData : [];
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-muted p-2 text-xs flex items-center justify-between">
        <span>DataFrame Preview</span>
        <span>
          {safeOutputData.length > 0 ? 
            `${safeOutputData.length} rows × ${Object.keys(safeOutputData[0] || {}).length} columns` : 
            '0 rows × 0 columns'}
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

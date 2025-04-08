
import React from "react";
import DataTable from "@/components/DataTable";

interface PythonDataPreviewProps {
  outputData: any[];
}

const PythonDataPreview: React.FC<PythonDataPreviewProps> = ({ outputData }) => {
  // Add multiple safeguards to ensure we always have an array
  const safeOutputData = Array.isArray(outputData) ? outputData : [];
  
  // Get columns count safely
  const columnsCount = safeOutputData.length > 0 
    ? Object.keys(safeOutputData[0] || {}).length 
    : 0;
  
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

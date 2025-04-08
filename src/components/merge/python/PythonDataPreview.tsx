
import React from "react";
import DataTable from "@/components/DataTable";

interface PythonDataPreviewProps {
  outputData: any[];
}

const PythonDataPreview: React.FC<PythonDataPreviewProps> = ({ outputData }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-muted p-2 text-xs flex items-center justify-between">
        <span>DataFrame Preview</span>
        <span>
          {outputData.length > 0 ? 
            `${outputData.length} rows × ${Object.keys(outputData[0] || {}).length} columns` : 
            ''}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <DataTable 
          data={outputData} 
          maxHeight="100%"
        />
      </div>
    </div>
  );
};

export default PythonDataPreview;

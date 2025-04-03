
import React from "react";
import { FileCode } from "lucide-react";

const EmptyView: React.FC = () => {
  return (
    <div className="text-center p-8 border border-dashed rounded-lg">
      <FileCode className="w-12 h-12 mx-auto text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">No Files Selected</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Please select at least one file to begin Python transformations.
      </p>
    </div>
  );
};

export default EmptyView;

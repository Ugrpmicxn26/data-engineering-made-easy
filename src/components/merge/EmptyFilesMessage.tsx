
import React from "react";
import { MergeIcon } from "lucide-react";

const EmptyFilesMessage: React.FC = () => {
  return (
    <div className="text-center p-8 bg-muted/30 rounded-lg animate-fade-in">
      <MergeIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
      <h3 className="font-medium text-lg mb-1">Select Files to Process</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Please select at least one file from the list above to start configuring transformation options.
      </p>
    </div>
  );
};

export default EmptyFilesMessage;


import React, { useState, useMemo } from "react";
import { FileData } from "@/utils/fileUtils";
import { toast } from "sonner";

// Import refactored components
import ActionTabs, { ACTION_TYPES } from "./merge/ActionTabs";
import MergeTab from "./merge/MergeTab";
import DropColumnsTab from "./merge/DropColumnsTab";
import DropRowsTab from "./merge/DropRowsTab";
import RenameColumnsTab from "./merge/RenameColumnsTab";
import TrimColumnsTab from "./merge/TrimColumnsTab";
import PivotTab from "./merge/PivotTab";
import RegexTransformTab from "./merge/RegexTransformTab";
import GroupByTab from "./merge/GroupByTab";
import PythonTab from "./merge/PythonTab";
import ColumnFormatterTab from "./merge/ColumnFormatterTab";
import DataVisualizationTab from "./merge/DataVisualizationTab";
import EmptyFilesMessage from "./merge/EmptyFilesMessage";

interface MergeConfiguratorProps {
  files: FileData[];
  onMergeComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

const MergeConfigurator: React.FC<MergeConfiguratorProps> = ({ files, onMergeComplete }) => {
  const [currentAction, setCurrentAction] = useState<string>(ACTION_TYPES.MERGE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedFiles = useMemo(() => files.filter(file => file.selected), [files]);
  
  const handleComplete = (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => {
    setIsProcessing(false);
    onMergeComplete(data, updatedFiles, saveAsMergedFile);
  };

  const handleActionStart = (callback: () => void) => {
    setIsProcessing(true);
    try {
      callback();
    } catch (error) {
      console.error("Error processing action:", error);
      toast.error("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (selectedFiles.length === 0) {
    return <EmptyFilesMessage />;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <ActionTabs 
        currentAction={currentAction} 
        setCurrentAction={setCurrentAction}
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />
      
      <div className="w-full p-4 bg-card/40 backdrop-blur-sm rounded-lg">
        {currentAction === ACTION_TYPES.MERGE && (
          <MergeTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.DROP_COLUMNS && (
          <DropColumnsTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.DROP_ROWS && (
          <DropRowsTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.RENAME_COLUMNS && (
          <RenameColumnsTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.TRIM_COLUMNS && (
          <TrimColumnsTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.PIVOT && (
          <PivotTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.REGEX_TRANSFORM && (
          <RegexTransformTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.GROUP_BY && (
          <GroupByTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.PYTHON && (
          <PythonTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}
        
        {currentAction === ACTION_TYPES.COLUMN_FORMATTER && (
          <ColumnFormatterTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}

        {currentAction === ACTION_TYPES.DATA_VISUALIZATION && (
          <DataVisualizationTab 
            files={files} 
            selectedFiles={selectedFiles} 
            isProcessing={isProcessing} 
            onComplete={handleComplete} 
          />
        )}
      </div>
    </div>
  );
};

export default MergeConfigurator;

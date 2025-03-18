
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Layers,
  ColumnsIcon,
  RowsIcon,
  Tag,
  Scissors,
  Grid3X3,
  Replace,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionTabsProps {
  currentAction: string;
  setCurrentAction: (action: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const ACTION_TYPES = {
  MERGE: "merge",
  DROP_COLUMNS: "dropColumns",
  DROP_ROWS: "dropRows",
  RENAME_COLUMNS: "renameColumns",
  TRIM_COLUMNS: "trimColumns",
  PIVOT: "pivot",
  REGEX_TRANSFORM: "regexTransform"
};

const ActionTabs: React.FC<ActionTabsProps> = ({ 
  currentAction, 
  setCurrentAction, 
  sidebarCollapsed, 
  toggleSidebar 
}) => {
  const actionButtons = [
    {
      type: ACTION_TYPES.MERGE,
      label: "Merge Data",
      icon: Layers
    },
    {
      type: ACTION_TYPES.DROP_COLUMNS,
      label: "Drop Columns",
      icon: ColumnsIcon
    },
    {
      type: ACTION_TYPES.DROP_ROWS,
      label: "Filter By Values",
      icon: RowsIcon
    },
    {
      type: ACTION_TYPES.RENAME_COLUMNS,
      label: "Rename Columns",
      icon: Tag
    },
    {
      type: ACTION_TYPES.TRIM_COLUMNS,
      label: "Trim Values",
      icon: Scissors
    },
    {
      type: ACTION_TYPES.PIVOT,
      label: "Pivot Table",
      icon: Grid3X3
    },
    {
      type: ACTION_TYPES.REGEX_TRANSFORM,
      label: "Column Transformer",
      icon: Replace
    }
  ];

  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out flex flex-col h-full border-r bg-card/80 backdrop-blur-sm",
      sidebarCollapsed ? "w-16" : "w-56"
    )}>
      <div className="flex justify-end p-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
      
      <div className="p-2 flex-1 overflow-y-auto space-y-1">
        {actionButtons.map(({ type, label, icon: Icon }) => (
          <Button 
            key={type}
            variant={currentAction === type ? "default" : "ghost"} 
            size="sm"
            onClick={() => setCurrentAction(type)}
            className={cn(
              "w-full justify-start",
              sidebarCollapsed ? "px-2" : "px-4"
            )}
          >
            <Icon className={cn("h-4 w-4", sidebarCollapsed ? "mr-0" : "mr-2")} />
            {!sidebarCollapsed && <span>{label}</span>}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ActionTabs;

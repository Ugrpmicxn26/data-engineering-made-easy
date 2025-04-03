
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
  ChevronRight,
  GroupIcon,
  FileCode,
  SplitSquareHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  REGEX_TRANSFORM: "regexTransform",
  GROUP_BY: "groupBy",
  PYTHON: "python",
  COLUMN_FORMATTER: "columnFormatter"
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
    },
    {
      type: ACTION_TYPES.GROUP_BY,
      label: "Group By",
      icon: GroupIcon
    },
    {
      type: ACTION_TYPES.PYTHON,
      label: "Python Notebook",
      icon: FileCode
    },
    {
      type: ACTION_TYPES.COLUMN_FORMATTER,
      label: "Split & Format",
      icon: SplitSquareHorizontal
    }
  ];

  return (
    <div className="w-full mb-6 bg-card rounded-lg shadow-sm">
      <Tabs value={currentAction} onValueChange={setCurrentAction} className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap justify-start gap-1 p-2">
          {actionButtons.map(({ type, label, icon: Icon }) => (
            <TabsTrigger 
              key={type} 
              value={type}
              className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4 mr-2" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ActionTabs;

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
  SplitSquareHorizontal,
  BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
  COLUMN_FORMATTER: "columnFormatter",
  DATA_VISUALIZATION: "dataVisualization"
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
      icon: Layers,
      color: "blue"
    },
    {
      type: ACTION_TYPES.DROP_COLUMNS,
      label: "Drop Columns",
      icon: ColumnsIcon,
      color: "purple"
    },
    {
      type: ACTION_TYPES.DROP_ROWS,
      label: "Filter By Values",
      icon: RowsIcon,
      color: "green"
    },
    {
      type: ACTION_TYPES.RENAME_COLUMNS,
      label: "Rename Columns",
      icon: Tag,
      color: "pink"
    },
    {
      type: ACTION_TYPES.TRIM_COLUMNS,
      label: "Trim Values",
      icon: Scissors,
      color: "amber"
    },
    {
      type: ACTION_TYPES.PIVOT,
      label: "Pivot Table",
      icon: Grid3X3,
      color: "cyan"
    },
    {
      type: ACTION_TYPES.REGEX_TRANSFORM,
      label: "Column Transformer",
      icon: Replace,
      color: "indigo"
    },
    {
      type: ACTION_TYPES.GROUP_BY,
      label: "Group By",
      icon: GroupIcon,
      color: "orange"
    },
    {
      type: ACTION_TYPES.PYTHON,
      label: "Python Notebook",
      icon: FileCode,
      color: "emerald"
    },
    {
      type: ACTION_TYPES.COLUMN_FORMATTER,
      label: "Split & Format",
      icon: SplitSquareHorizontal,
      color: "teal"
    },
    {
      type: ACTION_TYPES.DATA_VISUALIZATION,
      label: "Data Visualization",
      icon: BarChart2,
      color: "rose"
    }
  ];
  
  const getIconColorClass = (color: string, isActive: boolean) => {
    if (isActive) return "text-white";
    
    const colorMap: Record<string, string> = {
      blue: "text-blue-500",
      purple: "text-purple-500",
      green: "text-green-500",
      pink: "text-pink-500",
      amber: "text-amber-500",
      cyan: "text-cyan-500",
      indigo: "text-indigo-500",
      orange: "text-orange-500",
      emerald: "text-emerald-500",
      teal: "text-teal-500",
      rose: "text-rose-500"
    };
    
    return colorMap[color] || "text-primary";
  };
  
  const getActiveBackgroundClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500",
      purple: "bg-purple-500",
      green: "bg-green-500",
      pink: "bg-pink-500",
      amber: "bg-amber-500",
      cyan: "bg-cyan-500",
      indigo: "bg-indigo-500",
      orange: "bg-orange-500",
      emerald: "bg-emerald-500",
      teal: "bg-teal-500",
      rose: "bg-rose-500"
    };
    
    return colorMap[color] || "bg-primary";
  };

  return (
    <div className="w-full mb-6 bg-card/40 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      <Tabs value={currentAction} onValueChange={setCurrentAction} className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap justify-start gap-1 p-2">
          {actionButtons.map(({ type, label, icon: Icon, color }) => {
            const isActive = currentAction === type;
            return (
              <TabsTrigger 
                key={type} 
                value={type}
                className={cn(
                  "flex items-center transition-all",
                  isActive 
                    ? `${getActiveBackgroundClass(color)} text-white`
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn("h-4 w-4 mr-2", getIconColorClass(color, isActive))} />
                <span>{label}</span>
                
                {type === ACTION_TYPES.COLUMN_FORMATTER && (
                  <Badge variant="purple" className="ml-1.5 text-[0.6rem] py-0 h-4">New</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ActionTabs;

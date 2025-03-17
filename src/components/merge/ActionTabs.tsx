
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Layers,
  ColumnsIcon,
  RowsIcon,
  Tag,
  Scissors,
  Grid3X3
} from "lucide-react";

interface ActionTabsProps {
  currentAction: string;
  setCurrentAction: (action: string) => void;
}

export const ACTION_TYPES = {
  MERGE: "merge",
  DROP_COLUMNS: "dropColumns",
  DROP_ROWS: "dropRows",
  RENAME_COLUMNS: "renameColumns",
  TRIM_COLUMNS: "trimColumns",
  PIVOT: "pivot"
};

const ActionTabs: React.FC<ActionTabsProps> = ({ currentAction, setCurrentAction }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button 
        variant={currentAction === ACTION_TYPES.MERGE ? "default" : "outline"} 
        size="sm"
        onClick={() => setCurrentAction(ACTION_TYPES.MERGE)}
      >
        <Layers className="mr-2 h-4 w-4" />
        Merge Data
      </Button>
      <Button 
        variant={currentAction === ACTION_TYPES.DROP_COLUMNS ? "default" : "outline"} 
        size="sm"
        onClick={() => setCurrentAction(ACTION_TYPES.DROP_COLUMNS)}
      >
        <ColumnsIcon className="mr-2 h-4 w-4" />
        Drop Columns
      </Button>
      <Button 
        variant={currentAction === ACTION_TYPES.DROP_ROWS ? "default" : "outline"} 
        size="sm"
        onClick={() => setCurrentAction(ACTION_TYPES.DROP_ROWS)}
      >
        <RowsIcon className="mr-2 h-4 w-4" />
        Filter By Values
      </Button>
      <Button 
        variant={currentAction === ACTION_TYPES.RENAME_COLUMNS ? "default" : "outline"} 
        size="sm"
        onClick={() => setCurrentAction(ACTION_TYPES.RENAME_COLUMNS)}
      >
        <Tag className="mr-2 h-4 w-4" />
        Rename Columns
      </Button>
      <Button 
        variant={currentAction === ACTION_TYPES.TRIM_COLUMNS ? "default" : "outline"} 
        size="sm"
        onClick={() => setCurrentAction(ACTION_TYPES.TRIM_COLUMNS)}
      >
        <Scissors className="mr-2 h-4 w-4" />
        Trim Values
      </Button>
      <Button 
        variant={currentAction === ACTION_TYPES.PIVOT ? "default" : "outline"} 
        size="sm"
        onClick={() => setCurrentAction(ACTION_TYPES.PIVOT)}
      >
        <Grid3X3 className="mr-2 h-4 w-4" />
        Pivot Table
      </Button>
    </div>
  );
};

export default ActionTabs;

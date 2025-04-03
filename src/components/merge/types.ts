
import { JoinType, PivotConfig, FileData } from "@/utils/fileUtils";

export interface MergeConfiguratorProps {
  files: FileData[];
  onMergeComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

export interface ActionTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

export interface KeyColumnEntry {
  fileId: string;
  column: string;
  index: number;
}

export type AggregationType = 'first' | 'commaSeparated' | 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface MergeTabState {
  keyColumns: Record<string, string[]>;
  includeColumns: Record<string, string[]>;
  joinType: JoinType;
  baseFileId: string | null;
  saveMergedFile: boolean;
  mergedFileName: string;
  aggregationStrategy: AggregationType;
}

export interface DropColumnsTabState {
  dropColumnsFile: string | null;
  columnsToExclude: string[];
  mode: 'drop' | 'keep';  // New property to toggle between drop and keep modes
}

export interface DropRowsTabState {
  dropRowsFile: string | null;
  dropRowsColumn: string | null;
  dropRowsValues: string;
}

export interface RenameColumnsTabState {
  renameColumnsFile: string | null;
  columnRenames: Record<string, string>;
}

export interface TrimColumnsTabState {
  trimColumnsFile: string | null;
  columnsToTrim: string[];
}

export interface PivotTabState {
  pivotFile: string | null;
  pivotConfig: PivotConfig;
}

export interface RegexTransformTabState {
  fileId: string | null;
  column: string | null;
  pattern: string;
  replacement: string;
  globalFlag: boolean;
  caseInsensitiveFlag: boolean;
  multilineFlag: boolean;
  previewTransform: boolean;
  preview: { original: string; transformed: string }[];
  transformMode: 'modify' | 'newColumn';
  newColumnName: string;
  columnFormula: string;
  defaultValue: string;
  referenceColumns: string[];
}

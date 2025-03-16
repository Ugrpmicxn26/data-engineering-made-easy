/**
 * Utility functions for file processing, CSV parsing, and merging
 */

import { toast } from "sonner";
import JSZip from "jszip";
import Papa from "papaparse";

// Type definitions
export interface FileData {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  data: any[] | null;
  columns: string[];
  selected: boolean;
}

export type JoinType = "inner" | "left" | "full";

export interface MergeOptions {
  files: string[];
  baseFileId?: string; // New field to specify which file is the base for left join
  keyColumns: Record<string, string[]>;
  includeColumns: Record<string, string[]>;
  joinType: JoinType;
}

export interface ColumnInfo {
  name: string;
  type: string;
  sampleValues: string[];
}

export interface PivotConfig {
  rowFields: string[];
  columnField: string;
  valueFields: string[];
  aggregation: "sum" | "count" | "average" | "min" | "max" | "first";
}

// Function to read a file as text
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// Function to extract files from a ZIP archive
export const extractZipFiles = async (file: File): Promise<File[]> => {
  try {
    const zip = await JSZip.loadAsync(file);
    const extractedFiles: File[] = [];

    for (const filename of Object.keys(zip.files)) {
      // Skip directories and non-CSV files
      if (zip.files[filename].dir || !filename.toLowerCase().endsWith(".csv")) {
        continue;
      }

      const content = await zip.files[filename].async("blob");
      const extractedFile = new File([content], filename, { type: "text/csv" });
      extractedFiles.push(extractedFile);
    }

    return extractedFiles;
  } catch (error) {
    console.error("Error extracting ZIP:", error);
    toast.error("Failed to extract ZIP file");
    return [];
  }
};

// Function to parse CSV content
export const parseCSV = (content: string): Promise<{ data: any[]; columns: string[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Get column names from the first result and trim them
        const columns = (results.meta.fields || []).map(col => col.trim());
        
        // Trim values in all rows
        const trimmedData = results.data.map(row => {
          const trimmedRow: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            const trimmedKey = key.trim();
            const value = row[key];
            trimmedRow[trimmedKey] = typeof value === 'string' ? value.trim() : value;
          });
          return trimmedRow;
        });
        
        resolve({ data: trimmedData, columns });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

// Function to merge multiple datasets based on key columns
export const mergeDatasets = (
  datasets: Record<string, any[]>,
  keyColumns: Record<string, string[]>,
  includeColumns: Record<string, string[]>,
  joinType: JoinType = "inner",
  baseFileId?: string
): any[] => {
  const fileIds = Object.keys(datasets);
  if (fileIds.length < 2) return [];

  // Determine the base file ID
  // For left join, use specified baseFileId or default to first file
  // For other joins, base file doesn't matter as much
  const baseFileId_ = (joinType === "left" && baseFileId) ? baseFileId : fileIds[0];
  
  // Ensure the base file is first in the fileIds array for left join
  if (joinType === "left" && baseFileId_ !== fileIds[0]) {
    // Remove the base file from its current position
    const baseIndex = fileIds.indexOf(baseFileId_);
    if (baseIndex > 0) {
      fileIds.splice(baseIndex, 1);
      // Insert at the beginning
      fileIds.unshift(baseFileId_);
    }
  }

  const baseKeyColumns = keyColumns[baseFileId_];
  const baseData = datasets[baseFileId_];
  
  // Create a results array to store merged rows
  const result: any[] = [];
  
  // Create maps for each dataset keyed by the composite key
  const dataMaps: Record<string, Map<string, any>> = {};
  
  // Create a set to track all composite keys from all datasets if full join
  const allKeys = new Set<string>();
  
  // Create a map for each dataset
  fileIds.forEach(fileId => {
    const data = datasets[fileId];
    const keyColumnsForFile = keyColumns[fileId];
    const dataMap = new Map<string, any>();
    
    data.forEach(row => {
      // Create composite key from key columns
      const keyValues = keyColumnsForFile.map(col => String(row[col] || '').trim());
      const compositeKey = keyValues.join('|');
      
      if (compositeKey) {
        dataMap.set(compositeKey, row);
        if (joinType === "full") {
          allKeys.add(compositeKey);
        }
      }
    });
    
    dataMaps[fileId] = dataMap;
  });
  
  // For left join and inner join, iterate through base data
  if (joinType === "inner" || joinType === "left") {
    baseData.forEach(baseRow => {
      // Create composite key for base row
      const keyValues = baseKeyColumns.map(col => String(baseRow[col] || '').trim());
      const compositeKey = keyValues.join('|');
      
      if (!compositeKey) return;
      
      // Start with selected columns from base dataset
      const mergedRow: Record<string, any> = {};
      
      // Add selected columns from base dataset
      includeColumns[baseFileId_].forEach(col => {
        mergedRow[`${baseFileId_}:${col}`] = baseRow[col];
      });
      
      // Check if this key exists in other datasets and add their columns
      let foundInAllDatasets = true;
      
      for (let i = 1; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        const dataMap = dataMaps[fileId];
        const matchingRow = dataMap.get(compositeKey);
        
        if (matchingRow) {
          // Add selected columns from this dataset
          includeColumns[fileId].forEach(col => {
            mergedRow[`${fileId}:${col}`] = matchingRow[col];
          });
        } else {
          foundInAllDatasets = false;
          // Add null values for missing datasets
          includeColumns[fileId].forEach(col => {
            mergedRow[`${fileId}:${col}`] = null;
          });
        }
      }
      
      // Add to result if it meets join criteria
      if (joinType === "inner" && foundInAllDatasets) {
        // Inner join: Only add if found in all datasets
        result.push(mergedRow);
      } else if (joinType === "left") {
        // Left join: Add all rows from left table (base)
        result.push(mergedRow);
      }
    });
  } 
  // For full join, iterate through all unique keys
  else if (joinType === "full") {
    allKeys.forEach(compositeKey => {
      const mergedRow: Record<string, any> = {};
      
      // Add data from each file if available
      fileIds.forEach(fileId => {
        const dataMap = dataMaps[fileId];
        const matchingRow = dataMap.get(compositeKey);
        
        if (matchingRow) {
          includeColumns[fileId].forEach(col => {
            mergedRow[`${fileId}:${col}`] = matchingRow[col];
          });
        } else {
          includeColumns[fileId].forEach(col => {
            mergedRow[`${fileId}:${col}`] = null;
          });
        }
      });
      
      result.push(mergedRow);
    });
  }
  
  return result;
};

// Detect data types for columns
export const detectColumnTypes = (data: any[]): Record<string, ColumnInfo> => {
  if (!data || data.length === 0) return {};
  
  const columns = Object.keys(data[0]);
  const result: Record<string, ColumnInfo> = {};
  
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(Boolean);
    let type = 'string';
    
    // Get up to 3 sample values
    const sampleValues = values.slice(0, 3).map(v => String(v));
    
    // Check if all values are numeric
    if (values.every(val => !isNaN(Number(val)))) {
      // Check if they're all integers
      if (values.every(val => Number.isInteger(Number(val)))) {
        type = 'integer';
      } else {
        type = 'decimal';
      }
    } 
    // Check if all values are dates
    else if (values.every(val => !isNaN(Date.parse(String(val))))) {
      type = 'date';
    }
    
    result[col] = { name: col, type, sampleValues };
  });
  
  return result;
};

// Function to filter rows based on values in a specific column
export const filterRows = (
  data: any[],
  column: string,
  values: string[],
  exclude: boolean = true
): any[] => {
  if (!data || !column || values.length === 0) return data;

  return data.filter((row) => {
    const cellValue = String(row[column] || '').trim();
    const valueExists = values.some(v => cellValue === v.trim());
    return exclude ? !valueExists : valueExists;
  });
};

// Function to exclude columns from a dataset
export const excludeColumns = (
  data: any[],
  columns: string[]
): any[] => {
  if (!data || columns.length === 0) return data;

  return data.map((row) => {
    const newRow = { ...row };
    columns.forEach((col) => {
      delete newRow[col];
    });
    return newRow;
  });
};

// Function to rename columns in a dataset
export const renameColumns = (
  data: any[],
  columnMap: Record<string, string>
): any[] => {
  if (!data || Object.keys(columnMap).length === 0) return data;

  return data.map((row) => {
    const newRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      const newKey = columnMap[key] || key;
      newRow[newKey] = row[key];
    });
    return newRow;
  });
};

// Function to trim values in specific columns
export const trimColumnValues = (
  data: any[],
  columns: string[]
): any[] => {
  if (!data || !columns.length) return data;

  return data.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      if (col in newRow && typeof newRow[col] === 'string') {
        newRow[col] = newRow[col].trim();
      }
    });
    return newRow;
  });
};

// Function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Function to generate CSV from data
export const generateCSV = (data: any[]): string => {
  return Papa.unparse(data);
};

// Function to download data as CSV
export const downloadCSV = (data: any[], filename: string): void => {
  const csv = generateCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Function to pivot data
export function pivotData(data: any[], config: PivotConfig): any[] {
  if (!data || data.length === 0) return [];

  const { rowFields, columnField, valueFields, aggregation } = config;
  
  if (!rowFields.length || !columnField || !valueFields.length) {
    return [];
  }

  // Get unique column values
  const columnValues = [...new Set(data.map(row => row[columnField]))];
  
  // Group data by row fields
  const groupedData: Record<string, any[]> = {};
  
  data.forEach(row => {
    const rowKey = rowFields.map(field => String(row[field])).join('|');
    
    if (!groupedData[rowKey]) {
      groupedData[rowKey] = [];
    }
    
    groupedData[rowKey].push(row);
  });
  
  // Create the pivoted data
  const pivotedData: any[] = [];
  
  Object.entries(groupedData).forEach(([rowKey, rows]) => {
    const newRow: Record<string, any> = {};
    
    // Add row fields to the new row
    const rowKeyParts = rowKey.split('|');
    rowFields.forEach((field, index) => {
      newRow[field] = rowKeyParts[index];
    });
    
    // For each unique column value and each value field, calculate the aggregated value
    columnValues.forEach(colValue => {
      if (colValue === null || colValue === undefined) return;
      
      const matchingRows = rows.filter(row => row[columnField] === colValue);
      
      valueFields.forEach(valueField => {
        const pivotColName = `${colValue}_${valueField}`;
        
        if (matchingRows.length === 0) {
          newRow[pivotColName] = null;
          return;
        }
        
        const values = matchingRows
          .map(row => {
            const val = row[valueField];
            return isNaN(Number(val)) && aggregation !== "first" && aggregation !== "count" ? null : val;
          })
          .filter(val => val !== null);
        
        if (values.length === 0) {
          newRow[pivotColName] = null;
          return;
        }
        
        switch (aggregation) {
          case 'sum':
            newRow[pivotColName] = values.reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'count':
            newRow[pivotColName] = values.length;
            break;
          case 'average':
            newRow[pivotColName] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
            break;
          case 'min':
            newRow[pivotColName] = Math.min(...values.map(v => Number(v)));
            break;
          case 'max':
            newRow[pivotColName] = Math.max(...values.map(v => Number(v)));
            break;
          case 'first':
            newRow[pivotColName] = values[0];
            break;
          default:
            newRow[pivotColName] = null;
        }
      });
    });
    
    pivotedData.push(newRow);
  });
  
  return pivotedData;
}

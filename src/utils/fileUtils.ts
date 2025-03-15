
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

export interface MergeOptions {
  files: string[];
  keyColumns: Record<string, string[]>;
  includeColumns: Record<string, string[]>;
}

export interface ColumnInfo {
  name: string;
  type: string;
  sampleValues: string[];
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
  includeColumns: Record<string, string[]>
): any[] => {
  const fileIds = Object.keys(datasets);
  if (fileIds.length < 2) return [];

  // Use the first dataset as the base
  const baseFileId = fileIds[0];
  const baseKeyColumns = keyColumns[baseFileId];
  const baseData = datasets[baseFileId];
  
  // Create a results array to store merged rows
  const result: any[] = [];
  
  // Create maps for each dataset keyed by the composite key
  const dataMaps: Record<string, Map<string, any>> = {};
  
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
      }
    });
    
    dataMaps[fileId] = dataMap;
  });
  
  // Use base data and iterate through each row
  baseData.forEach(baseRow => {
    // Create composite key for base row
    const keyValues = baseKeyColumns.map(col => String(baseRow[col] || '').trim());
    const compositeKey = keyValues.join('|');
    
    if (!compositeKey) return;
    
    // Start with selected columns from base dataset
    const mergedRow: Record<string, any> = {};
    
    // Add selected columns from base dataset
    includeColumns[baseFileId].forEach(col => {
      mergedRow[`${baseFileId}:${col}`] = baseRow[col];
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
    
    // Add to result if found in at least one other dataset
    if (foundInAllDatasets) {
      result.push(mergedRow);
    }
  });
  
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

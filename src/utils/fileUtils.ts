
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
  keyColumns: Record<string, string>;
  includeColumns: Record<string, string[]>;
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
        // Get column names from the first result
        const columns = results.meta.fields || [];
        resolve({ data: results.data, columns });
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
  keyColumns: Record<string, string>,
  includeColumns: Record<string, string[]>
): any[] => {
  const fileIds = Object.keys(datasets);
  if (fileIds.length < 2) return [];

  // Use the first dataset as the base
  const baseFileId = fileIds[0];
  const baseKeyColumn = keyColumns[baseFileId];
  const baseData = datasets[baseFileId];
  const result: Record<string, any> = {};

  // Create a map of key values to rows for the base dataset
  baseData.forEach((row) => {
    const keyValue = row[baseKeyColumn];
    if (keyValue) {
      // Include only selected columns from base file
      const newRow: Record<string, any> = {};
      includeColumns[baseFileId].forEach((col) => {
        // Prefixing columns with file id to avoid column name conflicts
        newRow[`${baseFileId}:${col}`] = row[col];
      });
      result[keyValue] = newRow;
    }
  });

  // Merge additional datasets
  for (let i = 1; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    const keyColumn = keyColumns[fileId];
    const data = datasets[fileId];

    data.forEach((row) => {
      const keyValue = row[keyColumn];
      if (keyValue && result[keyValue]) {
        // Add columns from this dataset to existing rows
        includeColumns[fileId].forEach((col) => {
          result[keyValue][`${fileId}:${col}`] = row[col];
        });
      }
    });
  }

  // Convert result object back to array
  return Object.values(result);
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
    const valueExists = values.some(v => cellValue === v);
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


/**
 * Utility functions to fix TypeScript type errors and handle potential undefined values
 */

/**
 * Converts a number to string to fix TypeScript type errors
 * @param value - The number to convert to string
 * @returns The string representation of the number
 */
export const numToString = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  
  try {
    return String(value);
  } catch (error) {
    console.error("Error converting number to string:", error);
    return '';
  }
};

/**
 * Converts a string to number to fix TypeScript type errors
 * @param value - The string to convert to number
 * @returns The number representation of the string
 */
export const stringToNum = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  try {
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  } catch (error) {
    console.error("Error converting string to number:", error);
    return 0;
  }
};

/**
 * Safely checks if a value exists
 * @param value - The value to check
 * @returns Boolean indicating if the value exists and is not null/undefined
 */
export const exists = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Safely accesses array elements with bounds checking
 * @param arr - The array to access
 * @param index - The index to check
 * @returns The element at the index or undefined if out of bounds
 */
export const safeArrayAccess = <T>(arr: T[] | null | undefined, index: number): T | undefined => {
  if (!arr || index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
};

/**
 * Ultra-safe array access - never throws exceptions under any circumstances
 * @param arr - The array to access
 * @param index - The index to check
 * @returns The element at the index or undefined if any error occurs
 */
export const ultraSafeArrayAccess = <T>(arr: any, index: number): T | undefined => {
  try {
    if (arr === null || arr === undefined) return undefined;
    if (!Array.isArray(arr)) {
      // Try to convert to array if possible
      if (typeof arr === 'object' && Symbol.iterator in Object(arr)) {
        try {
          const arrCopy = Array.from(arr as Iterable<T>);
          return arrCopy[index];
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    }
    if (index < 0 || index >= arr.length) return undefined;
    return arr[index];
  } catch (e) {
    return undefined;
  }
};


/**
 * Utility functions to ensure correct type handling in operations
 */

/**
 * Ensures the value is a number before performing arithmetic operations
 * @param value Any value that should be treated as a number
 * @returns A number representation or 0 if conversion isn't possible
 */
export const ensureNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Ensures the value is an array before performing iterations
 * @param value Any value that should be treated as an array
 * @returns A safe array or empty array if input isn't iterable
 */
export const ensureArray = <T>(value: any): T[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  
  // Check if value is an iterable object and not a string
  if (typeof value === 'object' && value !== null && typeof value !== 'string') {
    try {
      if (Symbol.iterator in Object(value)) {
        return Array.from(value as Iterable<T>);
      }
      return [];
    } catch (error) {
      console.error("Failed to convert iterable to array:", error);
      return [];
    }
  }
  
  // If it's a string and we're looking for a string array, wrap it
  if (typeof value === 'string') {
    return [value] as unknown as T[];
  }
  
  // For other non-iterable values, return single item array
  return [value] as unknown as T[];
};

/**
 * Ensures a safe object access that won't throw errors
 * @param obj The object to access
 * @param defaultValue Default value if obj is null/undefined
 * @returns The object or default value
 */
export const ensureObject = <T extends object>(obj: T | null | undefined, defaultValue: T): T => {
  return obj === null || obj === undefined ? defaultValue : obj;
};

/**
 * Ensures string value is safe to use
 * @param value Any value that should be treated as a string
 * @returns A string representation or empty string if value is null/undefined
 */
export const ensureString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
};

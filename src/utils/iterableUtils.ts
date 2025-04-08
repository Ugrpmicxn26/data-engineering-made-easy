
/**
 * Utility functions for safely handling iterable objects
 */

/**
 * Safely converts a value to an array, ensuring it's iterable
 * This is a more thorough implementation to avoid "undefined is not iterable" errors
 * 
 * @param value Any value that needs to be converted to an array
 * @returns A safe array or empty array if input isn't iterable
 */
export const safelyToArray = <T>(value: any): T[] => {
  // Return empty array for null/undefined
  if (value === null || value === undefined) {
    return [];
  }
  
  // Already an array, return as is
  if (Array.isArray(value)) {
    return value;
  }
  
  // For string values, wrap in array if we're expecting string[]
  if (typeof value === 'string') {
    return [value] as unknown as T[];
  }
  
  // Check if value is an iterable object but not a string
  if (
    typeof value === 'object' && 
    value !== null && 
    typeof value !== 'string'
  ) {
    try {
      // First check if it has Symbol.iterator before trying to use it
      if (Symbol.iterator in Object(value)) {
        // Safely convert iterable to array with a try/catch
        try {
          return Array.from(value as Iterable<T>);
        } catch (error) {
          console.error("Failed to convert iterable to array:", error);
          return [];
        }
      }
      
      // If it's an object but not iterable, convert object values to array
      if (Object.keys(value).length > 0) {
        return Object.values(value) as T[];
      }
      
      return [];
    } catch (error) {
      console.error("Error processing object to array:", error);
      return [];
    }
  }
  
  // For non-iterable values, return as single-item array
  return [value] as unknown as T[];
};

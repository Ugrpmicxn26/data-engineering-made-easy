
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

/**
 * An even more robust function to safely handle iterables with additional checks
 * This function adds extra defensive coding to handle edge cases like Maps, Sets, etc.
 * 
 * @param value Any value that needs to be safely converted to an array
 * @returns A safe array guaranteed not to throw "undefined is not iterable" errors
 */
export const superSafeToArray = <T>(value: any): T[] => {
  // Handle null/undefined immediately
  if (value == null) return [];
  
  // Already an array, return as is (with null filter if requested)
  if (Array.isArray(value)) {
    return value;
  }
  
  // Special handling for common iterable types
  if (value instanceof Map) {
    try {
      return Array.from(value.values()) as T[];
    } catch (e) {
      return [];
    }
  }
  
  if (value instanceof Set) {
    try {
      return Array.from(value) as T[];
    } catch (e) {
      return [];
    }
  }
  
  // For string values, handle specially
  if (typeof value === 'string') {
    return [value] as unknown as T[];
  }
  
  // For objects, try various approaches
  if (typeof value === 'object') {
    try {
      // Check for iterable protocol
      if (typeof value[Symbol.iterator] === 'function') {
        try {
          return [...value] as T[];
        } catch (e) {
          // Fallback if spread operator fails
          try {
            return Array.from(value) as T[];
          } catch (e2) {
            return [];
          }
        }
      }
      
      // Return object values as fallback
      return Object.values(value) as T[];
    } catch (e) {
      return [];
    }
  }
  
  // For primitive non-iterable values, wrap in array
  return [value] as unknown as T[];
};


/**
 * Utility functions to ensure correct type handling in operations
 */

import { superSafeToArray, isSafelyIterable, makeSafelyIterable } from "./iterableUtils";

/**
 * Ensures the value is a number before performing arithmetic operations
 * @param value Any value that should be treated as a number
 * @returns A number representation or 0 if conversion isn't possible
 */
export const ensureNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  try {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  } catch (e) {
    console.warn("Error converting to number:", e);
    return 0;
  }
};

/**
 * Ensures the value is an array before performing iterations
 * Enhanced with multiple layers of protection
 * @param value Any value that should be treated as an array
 * @returns A safe array or empty array if input isn't iterable
 */
export const ensureArray = <T>(value: any): T[] => {
  // Handle null/undefined immediately
  if (value === null || value === undefined) {
    return [];
  }
  
  // First check if the value is iterable
  if (!isSafelyIterable(value) && value !== null && value !== undefined) {
    // For non-iterable but existing values, wrap in array
    if (typeof value === 'object') {
      try {
        return Object.values(value) as T[];
      } catch (e) {
        console.warn("Error converting object to array:", e);
        return [];
      }
    }
    return [value] as unknown as T[];
  }
  
  // Use the most robust array conversion method
  return superSafeToArray<T>(value);
};

/**
 * Ensures a safe object access that won't throw errors
 * @param obj The object to access
 * @param defaultValue Default value if obj is null/undefined
 * @returns The object or default value
 */
export const ensureObject = <T extends object>(obj: T | null | undefined, defaultValue: T): T => {
  if (obj === null || obj === undefined) return defaultValue;
  if (typeof obj !== 'object') return defaultValue;
  
  return obj;
};

/**
 * Ensures string value is safe to use
 * @param value Any value that should be treated as a string
 * @returns A string representation or empty string if value is null/undefined
 */
export const ensureString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  
  // Handle potential errors when converting objects to strings
  try {
    return String(value);
  } catch (error) {
    console.error("Error converting to string:", error);
    return '';
  }
};

/**
 * Ensures an object property is accessed safely without throwing errors
 * @param obj The object to access
 * @param propertyPath The path to the property (e.g., 'user.profile.name')
 * @param defaultValue Default value if property doesn't exist
 * @returns The property value or default value
 */
export const ensureProperty = <T>(obj: any, propertyPath: string, defaultValue: T): T => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  try {
    const parts = propertyPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current === undefined || current === null ? defaultValue : current as T;
  } catch (e) {
    console.warn("Error accessing object property:", e);
    return defaultValue;
  }
};

/**
 * Ultra-safe function to handle potential null/undefined values in nested objects
 * @param fn Function to execute
 * @param defaultValue Default value to return if an error occurs
 * @returns Result of the function or defaultValue if error
 */
export const safeFn = <T>(fn: () => T, defaultValue: T): T => {
  try {
    const result = fn();
    return result === undefined || result === null ? defaultValue : result;
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Creates a safe iterable proxy for any value
 * Useful when you need to iterate over something that might not be iterable
 * @param value The value to safely iterate over
 * @returns A safe iterable that won't throw errors
 */
export const ensureIterable = <T>(value: any): Iterable<T> => {
  return makeSafelyIterable<T>(value);
};

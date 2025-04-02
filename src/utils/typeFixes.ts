
/**
 * Utility functions to fix TypeScript type errors
 */

/**
 * Convert a number to string safely for display
 * This fixes the TypeScript error in PythonTab.tsx
 */
export const numToString = (value: number): string => {
  return value.toString();
};

/**
 * Format a number as a percentage string
 */
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

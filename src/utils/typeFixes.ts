
/**
 * Converts a number to string to fix TypeScript type errors
 * @param value - The number to convert to string
 * @returns The string representation of the number
 */
export const numToString = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

/**
 * Converts a string to number to fix TypeScript type errors
 * @param value - The string to convert to number
 * @returns The number representation of the string
 */
export const stringToNum = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  const num = parseFloat(String(value));
  return isNaN(num) ? 0 : num;
};

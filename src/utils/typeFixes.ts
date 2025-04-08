
/**
 * Converts a number to string to fix TypeScript type errors
 * @param value - The number to convert to string
 * @returns The string representation of the number
 */
export const numToString = (value: number): string => {
  return value.toString();
};

/**
 * Converts a string to number to fix TypeScript type errors
 * @param value - The string to convert to number
 * @returns The number representation of the string
 */
export const stringToNum = (value: string): number => {
  return Number(value);
};

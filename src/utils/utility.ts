/**
 * Returns the current date formatted as a string
 * @returns {string} Current date in ISO format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

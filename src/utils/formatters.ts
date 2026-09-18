/**
 * Price and numerical formatting utilities that strictly preserve original precision
 * and eliminate premature / destructive rounding (e.g. 0.02135 truncated to 0.02).
 */

export function formatExactPrice(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  
  if (val === 0) return '0';

  // Handle scientific notation (e.g. 1.23e-7)
  const valStr = String(val);
  if (valStr.includes('e') || valStr.includes('E')) {
    const fixed = val.toFixed(10);
    return fixed.replace(/\.?0+$/, '');
  }

  // Handle IEEE 754 precision artifacts like 84210.30000000001
  if (valStr.includes('.')) {
    const parts = valStr.split('.');
    if (parts[1].length > 8) {
      return parseFloat(val.toFixed(8)).toString();
    }
  }

  // Pure number string preserving all user / exchange provided decimal digits
  return valStr;
}

/**
 * Format axis grid ticks and crosshair prices dynamically based on the current chart price range
 */
export function formatAxisPrice(val: number, priceRange: number): string {
  if (isNaN(val)) return '-';
  
  if (priceRange <= 0.00001) return val.toFixed(8);
  if (priceRange <= 0.0001) return val.toFixed(7);
  if (priceRange <= 0.001) return val.toFixed(6);
  if (priceRange <= 0.01) return val.toFixed(5);
  if (priceRange <= 0.1) return val.toFixed(4);
  if (priceRange <= 1) return val.toFixed(3);
  if (priceRange <= 10) return val.toFixed(2);
  
  // For large ranges, if integer show 2 decimals or exact
  return val.toFixed(2);
}

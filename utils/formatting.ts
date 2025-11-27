
import type { Settings } from '../types';

/**
 * Formats a number as a currency string based on application or system settings.
 * @param amount The number to format.
 * @param settings The application settings containing locale and currency.
 * @param currencyOverride Optional currency code to use instead of the global setting.
 * @returns A formatted currency string.
 */
export const formatCurrency = (amount: number, settings: Settings | null, currencyOverride?: string): string => {
  const locale = settings?.locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const currency = currencyOverride || settings?.currency || 'USD';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    console.error('Failed to format currency with provided settings. Falling back to en-US/USD.', error);
    // Fallback for invalid locale/currency codes
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
};

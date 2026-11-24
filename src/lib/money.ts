// Money handling for Staff Portal (Nepal)
// All domain logic works in integer Paisa. Display helpers format to Rupees.
// 1 Rupee = 100 Paisa.

import type { Paisa } from '../types';

/**
 * Format a number according to the Indian/Nepali numbering system (12,34,567).
 * The last 3 digits are grouped, then groups of 2.
 */
export function formatIndianNumber(value: number): string {
  const isNegative = value < 0;
  const abs = Math.abs(Math.round(value));
  const s = abs.toString();

  if (s.length <= 3) {
    return (isNegative ? '-' : '') + s;
  }

  const lastThree = s.slice(-3);
  const rest = s.slice(0, -3);

  // Group rest by 2s from right to left
  const parts: string[] = [];
  let i = rest.length;
  while (i > 0) {
    const start = Math.max(0, i - 2);
    parts.unshift(rest.slice(start, i));
    i -= 2;
  }

  return (isNegative ? '-' : '') + parts.join(',') + ',' + lastThree;
}

export interface MoneyFormatOptions {
  currencySymbol?: string;
  showCurrency?: boolean;
  numberFormat?: 'indian' | 'international';
  decimals?: boolean; // default false: display whole Rupees
}

/**
 * Format integer Paisa as a currency string.
 * Example: 10000000 Paisa -> "Rs. 1,00,000"
 */
export function formatPaisa(
  paisa: Paisa,
  options: MoneyFormatOptions = {}
): string {
  const {
    currencySymbol = 'Rs.',
    showCurrency = true,
    numberFormat = 'indian',
    decimals = false,
  } = options;

  const rupees = paisa / 100;
  const isNegative = rupees < 0;
  const absRupees = Math.abs(rupees);

  let formattedNumber: string;

  if (decimals) {
    const whole = Math.floor(absRupees);
    const fraction = Math.round((absRupees - whole) * 100)
      .toString()
      .padStart(2, '0');
    const wholeFormatted =
      numberFormat === 'indian'
        ? formatIndianNumber(whole)
        : whole.toLocaleString('en-US');
    formattedNumber = `${wholeFormatted}.${fraction}`;
  } else {
    const rounded = Math.round(absRupees);
    formattedNumber =
      numberFormat === 'indian'
        ? formatIndianNumber(rounded)
        : rounded.toLocaleString('en-US');
  }

  const sign = isNegative ? '-' : '';
  const prefix = showCurrency ? `${currencySymbol} ` : '';
  return `${sign}${prefix}${formattedNumber}`;
}

/**
 * Convert Rupees (input by user) to integer Paisa.
 * Robust against strings like "1,00,000", "50000.50", etc.
 */
export function rupeesToPaisa(rupees: number | string): Paisa {
  if (typeof rupees === 'string') {
    const clean = rupees.replace(/,/g, '').trim();
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Convert integer Paisa back to Rupees (number, for input fields).
 */
export function paisaToRupees(paisa: Paisa): number {
  return Math.round(paisa) / 100;
}

/**
 * Convert number of Rupees into English words (South Asian numbering scale).
 */
export function rupeesToWords(rupees: number): string {
  const abs = Math.abs(Math.round(rupees));
  if (abs === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertBelowThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  let num = abs;
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertBelowThousand(crore) + ' Crore');
  if (lakh > 0) parts.push(convertBelowThousand(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertBelowThousand(thousand) + ' Thousand');
  if (remainder > 0) parts.push(convertBelowThousand(remainder));

  return parts.join(' ') + ' Rupees Only';
}


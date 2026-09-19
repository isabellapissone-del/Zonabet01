/**
 * Money utilities using integer cents (centavos) to avoid floating point errors
 */

export class Money {
  // Converts a decimal number or string (e.g. 10.50) into integer cents (1050)
  static toCents(amount: number | string): number {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  // Converts integer cents back to a 2-decimal number
  static fromCents(cents: number): number {
    return Math.round(cents) / 100;
  }

  // Formats to 2 decimal places fixed string (e.g. "100.00")
  static format(amount: number): string {
    return (Math.round(amount * 100) / 100).toFixed(2);
  }

  // Adds two amounts accurately
  static add(a: number, b: number): number {
    return Money.fromCents(Money.toCents(a) + Money.toCents(b));
  }

  // Subtracts b from a accurately
  static subtract(a: number, b: number): number {
    return Money.fromCents(Money.toCents(a) - Money.toCents(b));
  }

  // Multiplies stake by odds with standard 2-decimal rounding
  static multiply(amount: number, factor: number): number {
    const resultCents = Math.round(Money.toCents(amount) * factor);
    return Money.fromCents(resultCents);
  }

  // Validates if amount is positive and within bounds
  static isValidAmount(amount: number): boolean {
    return !isNaN(amount) && isFinite(amount) && amount > 0;
  }
}

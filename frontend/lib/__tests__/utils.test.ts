import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatVolume,
  getSignalColor,
  getStrengthLabel,
  getStrengthColor,
} from '@/lib/utils';

describe('formatPrice', () => {
  it('formats integer price with 2 decimals', () => {
    expect(formatPrice(150)).toBe('150.00');
  });

  it('formats decimal price', () => {
    expect(formatPrice(150.25)).toBe('150.25');
  });

  it('formats with custom decimals', () => {
    expect(formatPrice(150.123, 4)).toBe('150.1230');
  });

  it('formats large price', () => {
    expect(formatPrice(45231.5)).toBe('45,231.50');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0.00');
  });
});

describe('formatVolume', () => {
  it('formats billions', () => {
    expect(formatVolume(2_500_000_000)).toBe('2.50B');
  });

  it('formats millions', () => {
    expect(formatVolume(5_250_000)).toBe('5.25M');
  });

  it('formats thousands', () => {
    expect(formatVolume(1_500)).toBe('1.50K');
  });

  it('formats small numbers', () => {
    expect(formatVolume(500)).toBe('500');
  });

  it('formats zero', () => {
    expect(formatVolume(0)).toBe('0');
  });

  it('handles edge case at million boundary', () => {
    expect(formatVolume(1_000_000)).toBe('1.00M');
  });
});

describe('getSignalColor', () => {
  it('returns green for Buy', () => {
    expect(getSignalColor('Buy')).toBe('text-green-500');
  });

  it('returns red for Sell', () => {
    expect(getSignalColor('Sell')).toBe('text-red-500');
  });

  it('returns gray for neutral', () => {
    expect(getSignalColor('Neutral')).toBe('text-gray-500');
  });

  it('returns gray for unknown', () => {
    expect(getSignalColor('Unknown')).toBe('text-gray-500');
  });
});

describe('getStrengthLabel', () => {
  it('returns Strong for >= 70', () => {
    expect(getStrengthLabel(70)).toBe('Strong');
    expect(getStrengthLabel(100)).toBe('Strong');
  });

  it('returns Moderate for >= 40', () => {
    expect(getStrengthLabel(40)).toBe('Moderate');
    expect(getStrengthLabel(69)).toBe('Moderate');
  });

  it('returns Weak for < 40', () => {
    expect(getStrengthLabel(0)).toBe('Weak');
    expect(getStrengthLabel(39)).toBe('Weak');
  });
});

describe('getStrengthColor', () => {
  it('returns green for >= 70', () => {
    expect(getStrengthColor(70)).toBe('bg-green-500');
  });

  it('returns yellow for >= 40', () => {
    expect(getStrengthColor(40)).toBe('bg-yellow-500');
  });

  it('returns red for < 40', () => {
    expect(getStrengthColor(0)).toBe('bg-red-500');
  });
});

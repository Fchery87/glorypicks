import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  }
  return volume.toFixed(0);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function getSignalColor(recommendation: string): string {
  switch (recommendation) {
    case "Buy":
      return "text-green-500";
    case "Sell":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

export function getStrengthLabel(strength: number): string {
  if (strength >= 70) return "Strong";
  if (strength >= 40) return "Moderate";
  return "Weak";
}

export function getStrengthColor(strength: number): string {
  if (strength >= 70) return "bg-green-500";
  if (strength >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

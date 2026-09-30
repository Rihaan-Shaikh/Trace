/**
 * TRACE Formatting Helpers.
 * Ensures numbers and currency adhere to executive display rules.
 */

export function formatCurrency(value?: number, currency = '$'): string {
  if (value === undefined || value === null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${currency}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${currency}${(value / 1_000).toFixed(1)}K`;
  }
  return `${currency}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value?: number, decimals = 1): string {
  if (value === undefined || value === null) return '—';
  // If decimal between 0 and 1, multiply by 100
  const pct = Math.abs(value) <= 1.0 ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

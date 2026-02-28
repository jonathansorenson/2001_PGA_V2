// Format helpers for CRE dashboard
export const fmt = {
  currency: (v, decimals = 0) => {
    if (v == null || isNaN(v)) return '--';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals }).format(v);
  },
  currencyK: (v) => {
    if (v == null || isNaN(v)) return '--';
    return `$${(Number(v) / 1000).toFixed(0)}K`;
  },
  currencyM: (v) => {
    if (v == null || isNaN(v)) return '--';
    const m = Number(v) / 1_000_000;
    return m >= 1 ? `$${m.toFixed(2)}M` : `$${(Number(v) / 1000).toFixed(0)}K`;
  },
  pct: (v, decimals = 1) => {
    if (v == null || isNaN(v)) return '--';
    return `${Number(v).toFixed(decimals)}%`;
  },
  sf: (v) => {
    if (v == null || isNaN(v)) return '--';
    return `${Number(v).toLocaleString()} SF`;
  },
  date: (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  monthYear: (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  },
  number: (v, decimals = 0) => {
    if (v == null || isNaN(v)) return '--';
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals });
  },
};

export function leaseStatusColor(status) {
  const map = { Current: 'teal', MTM: 'yellow', Vacant: 'red', Future: 'future', Expired: 'red' };
  return map[status] || 'muted';
}

export function priorityColor(priority) {
  const map = { critical: 'red', high: 'yellow', medium: 'teal', low: 'muted' };
  return map[priority] || 'muted';
}

export function varianceColor(variance) {
  if (variance > 0.02) return 'text-green-400';
  if (variance < -0.02) return 'text-jll-red';
  return 'text-jll-muted';
}

export function variancePct(actual, budget) {
  if (!budget || budget === 0) return null;
  return ((actual - budget) / Math.abs(budget)) * 100;
}

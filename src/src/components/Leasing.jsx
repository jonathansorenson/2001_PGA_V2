import React from 'react';
import { Building2, DollarSign, Calendar } from 'lucide-react';

const formatCurrency = (num) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const getStatusBadge = (status) => {
  const styles = {
    Current: 'bg-success bg-opacity-10 text-success border-success',
    Vacant: 'bg-red bg-opacity-10 text-red border-red',
    MTM: 'bg-warn bg-opacity-10 text-warn border-warn',
    Future: 'bg-accent bg-opacity-10 text-accent border-accent',
  };
  return styles[status] || 'bg-muted bg-opacity-10 text-muted border-muted';
};

export default function Leasing({ data }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate totals
  const totals = {
    sf: data.leases.reduce((sum, lease) => sum + lease.sf, 0),
    rent: data.leases.reduce((sum, lease) => sum + lease.monthlyRent, 0),
    cam: data.leases.reduce((sum, lease) => sum + lease.camMonthly, 0),
  };

  // Lease expiry analysis by year
  const expiryByYear = {};
  data.leases.forEach(lease => {
    if (lease.leaseEnd) {
      const year = new Date(lease.leaseEnd).getFullYear();
      if (!expiryByYear[year]) {
        expiryByYear[year] = { sf: 0, count: 0, leases: [] };
      }
      expiryByYear[year].sf += lease.sf;
      expiryByYear[year].count += 1;
      expiryByYear[year].leases.push(lease.tenant);
    }
  });

  return (
    <div className="space-y-6">
      {/* Rent Roll Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Rent Roll</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-secondary font-medium">Unit</th>
                <th className="text-left py-3 px-4 text-secondary font-medium">Tenant</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">SF</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Monthly Rent</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Rent PSF</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">CAM</th>
                <th className="text-center py-3 px-4 text-secondary font-medium">Status</th>
                <th className="text-left py-3 px-4 text-secondary font-medium">Lease End</th>
              </tr>
            </thead>
            <tbody>
              {data.leases.map((lease) => (
                <tr key={lease.id} className="border-b border-border hover:bg-navy transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{lease.unit}</td>
                  <td className="py-3 px-4 text-white">{lease.tenant}</td>
                  <td className="py-3 px-4 text-right text-secondary">{formatNumber(lease.sf)}</td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {formatCurrency(lease.monthlyRent)}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary">
                    {lease.sf > 0 ? `$${formatNumber(lease.rentPSF)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary">{formatCurrency(lease.camMonthly)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getStatusBadge(lease.status)}`}>
                      {lease.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-secondary">{formatDate(lease.leaseEnd)}</td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="border-t-2 border-accent bg-navy">
                <td colSpan="2" className="py-3 px-4 text-white font-semibold">
                  TOTAL
                </td>
                <td className="py-3 px-4 text-right text-white font-semibold">{formatNumber(totals.sf)}</td>
                <td className="py-3 px-4 text-right text-accent font-semibold">{formatCurrency(totals.rent)}</td>
                <td className="py-3 px-4 text-right text-secondary">${formatNumber(totals.rent / (totals.sf || 1) * 12)}</td>
                <td className="py-3 px-4 text-right text-white font-semibold">{formatCurrency(totals.cam)}</td>
                <td colSpan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lease Expiry Stacking Plan */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-white">Lease Expiry Stacking Plan</h3>
        </div>

        <div className="space-y-3">
          {Object.entries(expiryByYear)
            .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
            .map(([year, data]) => (
              <div key={year} className="bg-navy rounded border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold">{year}</h4>
                  <div className="flex gap-4 text-sm">
                    <span className="text-secondary">{data.count} lease{data.count !== 1 ? 's' : ''}</span>
                    <span className="text-accent font-medium">{formatNumber(data.sf)} SF</span>
                  </div>
                </div>
                <div className="text-secondary text-sm space-y-1">
                  {data.leases.map((tenant, idx) => (
                    <p key={idx}>• {tenant}</p>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Lease Details Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary text-sm font-medium mb-2">Total Monthly Rent</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totals.rent)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-secondary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary text-sm font-medium mb-2">Total Monthly CAM</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totals.cam)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-secondary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary text-sm font-medium mb-2">Avg Rent PSF/Yr</p>
              <p className="text-2xl font-bold text-accent">${formatNumber((totals.rent / (totals.sf || 1)) * 12)}</p>
            </div>
            <Building2 className="w-5 h-5 text-secondary opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

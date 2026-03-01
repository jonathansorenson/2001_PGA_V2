import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, AlertCircle, TrendingUp, Users } from 'lucide-react';

const formatCurrency = (num) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function Overview({ data }) {
  // Prepare chart data - combine T12 and budget
  const chartData = data.t12Statement.map((month, idx) => {
    const monthNum = idx + 1;
    const monthStr = month.month.split(' ')[0];
    return {
      month: monthStr,
      actual: Math.round(month.noi),
      budget: Math.round(data.budget2026[idx]?.noi || 0),
    };
  });

  // KPI Cards
  const kpis = [
    { label: 'Total SF', value: formatNumber(data.totalSF), icon: '📐' },
    { label: 'Occupancy', value: `${formatNumber(data.occupancyPct)}%`, icon: '📊' },
    { label: 'Leased', value: `${formatNumber(data.leasedPct)}%`, icon: '✓' },
    { label: 'Monthly Rent', value: formatCurrency(data.currentBaseRent), icon: '$' },
    { label: 'WA Rent PSF', value: `$${formatNumber(data.waRentPSF)}`, icon: '💰' },
    { label: 'WALT', value: `${formatNumber(data.walt)} yrs`, icon: '📅' },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red bg-red bg-opacity-10 border-red';
      case 'HIGH':
        return 'text-warn bg-warn bg-opacity-10 border-warn';
      case 'MEDIUM':
        return 'text-accent bg-accent bg-opacity-10 border-accent';
      case 'LOW':
        return 'text-muted bg-muted bg-opacity-10 border-muted';
      default:
        return 'text-secondary bg-secondary bg-opacity-10 border-secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-secondary text-sm font-medium mb-2">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
              <span className="text-2xl opacity-50">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NOI vs Budget Chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">T12 NOI vs 2026 Budget</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
              <XAxis dataKey="month" stroke="#8A9BB0" />
              <YAxis stroke="#8A9BB0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F2236', border: '1px solid #1E3347' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="actual" fill="#4A8FD4" name="Actual T12 NOI" />
              <Bar dataKey="budget" fill="#F59E0B" name="2026 Budget NOI" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lease Expiry Profile */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Lease Expiry Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.expiryProfile}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
              <XAxis dataKey="year" stroke="#8A9BB0" />
              <YAxis stroke="#8A9BB0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F2236', border: '1px solid #1E3347' }}
                formatter={(value) => `${formatNumber(value)} SF`}
              />
              <Bar
                dataKey="sf"
                fill={(entry) => {
                  switch (entry.risk) {
                    case 'critical':
                      return '#C41230';
                    case 'high':
                      return '#F59E0B';
                    case 'medium':
                      return '#4A8FD4';
                    default:
                      return '#10B981';
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Watch List */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-warn" />
          <h3 className="text-lg font-semibold text-white">Near-Term Watch List</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-secondary text-sm font-medium">Priority</th>
                <th className="text-left py-3 px-4 text-secondary text-sm font-medium">Tenant</th>
                <th className="text-left py-3 px-4 text-secondary text-sm font-medium">Issue</th>
                <th className="text-left py-3 px-4 text-secondary text-sm font-medium">Impact</th>
              </tr>
            </thead>
            <tbody>
              {data.watchList.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-navy transition-colors">
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded text-xs font-semibold border ${getPriorityColor(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white font-medium text-sm">{item.tenant}</td>
                  <td className="py-4 px-4 text-secondary text-sm">{item.issue}</td>
                  <td className="py-4 px-4 text-secondary text-sm">{item.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

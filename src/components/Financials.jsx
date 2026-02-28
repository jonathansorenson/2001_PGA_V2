import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const formatCurrency = (num) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatCurrencyDetailed = (num) => {
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

export default function Financials({ data }) {
  // Prepare revenue vs expenses chart data
  const chartData = data.t12Statement.map((month, idx) => {
    const monthStr = month.month.split(' ')[0];
    return {
      month: monthStr,
      revenue: month.revenue,
      expenses: month.expenses,
    };
  });

  // Calculate T12 totals
  const t12Totals = {
    revenue: data.t12Statement.reduce((sum, m) => sum + m.revenue, 0),
    expenses: data.t12Statement.reduce((sum, m) => sum + m.expenses, 0),
    nonRec: data.t12Statement.reduce((sum, m) => sum + m.nonRec, 0),
    noi: data.t12Statement.reduce((sum, m) => sum + m.noi, 0),
  };

  // Calculate 2026 Budget totals
  const budget2026Totals = {
    income: data.budget2026.reduce((sum, m) => sum + m.income, 0),
    expenses: data.budget2026.reduce((sum, m) => sum + m.expenses, 0),
    noi: data.budget2026.reduce((sum, m) => sum + m.noi, 0),
  };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary text-sm font-medium mb-2">T12 Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(t12Totals.revenue)}</p>
              <p className="text-xs text-secondary mt-2">Jan 2025 - Dec 2025</p>
            </div>
            <TrendingUp className="w-5 h-5 text-success opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary text-sm font-medium mb-2">T12 NOI</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(t12Totals.noi)}</p>
              <p className="text-xs text-secondary mt-2">Margin: {formatNumber((t12Totals.noi / t12Totals.revenue) * 100)}%</p>
            </div>
            <DollarSign className="w-5 h-5 text-accent opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary text-sm font-medium mb-2">2026 Budget NOI</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(budget2026Totals.noi)}</p>
              <p className="text-xs text-secondary mt-2">Margin: {formatNumber((budget2026Totals.noi / budget2026Totals.income) * 100)}%</p>
            </div>
            <TrendingDown className="w-5 h-5 text-warn opacity-50" />
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Expenses - T12</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C41230" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C41230" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
            <XAxis dataKey="month" stroke="#8A9BB0" />
            <YAxis stroke="#8A9BB0" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F2236', border: '1px solid #1E3347' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#C41230"
              fillOpacity={1}
              fill="url(#colorExpenses)"
              name="Expenses"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* T12 Income Statement Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">T12 Monthly Income Statement</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-secondary font-medium">Month</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Revenue</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Expenses</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Non-Rec Items</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">NOI</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">NOI Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.t12Statement.map((month, idx) => {
                const margin = (month.noi / month.revenue) * 100;
                return (
                  <tr key={idx} className="border-b border-border hover:bg-navy transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{month.month}</td>
                    <td className="py-3 px-4 text-right text-success">{formatCurrency(month.revenue)}</td>
                    <td className="py-3 px-4 text-right text-red">{formatCurrency(month.expenses)}</td>
                    <td className="py-3 px-4 text-right text-secondary">{formatCurrency(month.nonRec)}</td>
                    <td className="py-3 px-4 text-right text-accent font-medium">{formatCurrency(month.noi)}</td>
                    <td className="py-3 px-4 text-right text-secondary">{formatNumber(margin)}%</td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="border-t-2 border-accent bg-navy">
                <td className="py-3 px-4 text-white font-semibold">TOTAL T12</td>
                <td className="py-3 px-4 text-right text-success font-semibold">{formatCurrency(t12Totals.revenue)}</td>
                <td className="py-3 px-4 text-right text-red font-semibold">{formatCurrency(t12Totals.expenses)}</td>
                <td className="py-3 px-4 text-right text-secondary font-semibold">{formatCurrency(t12Totals.nonRec)}</td>
                <td className="py-3 px-4 text-right text-accent font-semibold">{formatCurrency(t12Totals.noi)}</td>
                <td className="py-3 px-4 text-right text-accent font-semibold">
                  {formatNumber((t12Totals.noi / t12Totals.revenue) * 100)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2026 Budget Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">2026 Budget Summary</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-secondary font-medium">Month</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Income</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">Expenses</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">NOI</th>
                <th className="text-right py-3 px-4 text-secondary font-medium">NOI Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.budget2026.map((month, idx) => {
                const margin = (month.noi / month.income) * 100;
                return (
                  <tr key={idx} className="border-b border-border hover:bg-navy transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{month.month}</td>
                    <td className="py-3 px-4 text-right text-success">{formatCurrency(month.income)}</td>
                    <td className="py-3 px-4 text-right text-red">{formatCurrency(month.expenses)}</td>
                    <td className="py-3 px-4 text-right text-accent font-medium">{formatCurrency(month.noi)}</td>
                    <td className="py-3 px-4 text-right text-secondary">{formatNumber(margin)}%</td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="border-t-2 border-accent bg-navy">
                <td className="py-3 px-4 text-white font-semibold">TOTAL 2026</td>
                <td className="py-3 px-4 text-right text-success font-semibold">{formatCurrency(budget2026Totals.income)}</td>
                <td className="py-3 px-4 text-right text-red font-semibold">{formatCurrency(budget2026Totals.expenses)}</td>
                <td className="py-3 px-4 text-right text-accent font-semibold">{formatCurrency(budget2026Totals.noi)}</td>
                <td className="py-3 px-4 text-right text-accent font-semibold">
                  {formatNumber((budget2026Totals.noi / budget2026Totals.income) * 100)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="text-white font-semibold mb-4">Key Metrics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">T12 Avg Monthly Revenue</span>
              <span className="text-white font-medium">{formatCurrency(t12Totals.revenue / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">T12 Avg Monthly Expenses</span>
              <span className="text-white font-medium">{formatCurrency(t12Totals.expenses / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">T12 Avg Monthly NOI</span>
              <span className="text-accent font-medium">{formatCurrency(t12Totals.noi / 12)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-secondary">NOI/SF Annualized</span>
              <span className="text-accent font-medium">${formatNumber((t12Totals.noi / data.totalSF))}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="text-white font-semibold mb-4">2026 Outlook</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">Budget Avg Monthly Income</span>
              <span className="text-white font-medium">{formatCurrency(budget2026Totals.income / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Budget Avg Monthly Expenses</span>
              <span className="text-white font-medium">{formatCurrency(budget2026Totals.expenses / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Budget Avg Monthly NOI</span>
              <span className="text-accent font-medium">{formatCurrency(budget2026Totals.noi / 12)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-secondary">YoY Change (T12 vs Budget)</span>
              <span
                className={`font-medium ${
                  budget2026Totals.noi > t12Totals.noi ? 'text-success' : 'text-warn'
                }`}
              >
                {formatCurrency(budget2026Totals.noi - t12Totals.noi)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

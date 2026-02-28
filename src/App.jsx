import { useState, useEffect, useCallback } from 'react';
import { propertyData } from './data/pga3001';
import { isConnected } from './lib/supabase';
import {
  getPortfolio, getT12Monthly, getRentRoll, getBudget,
  getLeaseEvents, getExpiryProfile, getUploadHistory,
  getBalanceSheet, getSecurityDeposits,
  insertManagementReport, insertRentRoll, insertBudget,
} from './lib/dataService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import AskAIPanel from './components/AskAIPanel';
import DataUpload from './components/DataUpload';

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'leasing',    label: 'Leasing' },
  { id: 'financials', label: 'Financials' },
  { id: 'events',     label: 'Events' },
  { id: 'data',       label: 'Data' },
];

const fmt = {
  usd: v => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  sf: v => `${Number(v).toLocaleString()} SF`,
  pct: v => `${Number(v).toFixed(1)}%`,
};
const fmtM = v => `$${(v / 1000).toFixed(0)}K`;
const fmtM1 = v => `$${(v / 1000).toFixed(1)}K`;

// ── Shared components ────────────────────────────────────────
function Badge({ children, color = 'muted' }) {
  const cls = {
    muted:  'bg-jll-border/40 text-jll-muted',
    teal:   'bg-jll-teal/15 text-jll-accent border border-jll-teal/30',
    red:    'bg-jll-red/15 text-jll-red border border-jll-red/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    orange: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    future: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    green:  'bg-green-500/15 text-green-400 border border-green-500/30',
  }[color];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>;
}

function KPI({ label, value, sub, delta, highlight }) {
  return (
    <div className={`rounded-xl border p-4 animate-fade-up ${highlight ? 'border-jll-teal/30 bg-jll-teal/5' : 'border-jll-border bg-jll-card'}`}>
      <p className="text-xs text-jll-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-mono font-bold ${highlight ? 'text-jll-accent' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-jll-muted mt-0.5">{sub}</p>}
      {delta !== undefined && (
        <p className={`text-xs mt-0.5 font-medium ${delta >= 0 ? 'text-green-400' : 'text-jll-red'}`}>
          {delta >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(delta).toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// ── Static fallback data ─────────────────────────────────────
const staticData = propertyData;

// Helper to derive computed values from current state
function deriveData(prop, leases, t12Data, budgetData, expiryArr) {
  const allLeases = leases;
  const active = allLeases.filter(l => l.status === 'Current' || l.status === 'MTM');
  const vacant = allLeases.filter(l => l.status === 'Vacant');

  const budgetAvgNOI = budgetData.length ? budgetData.reduce((s, m) => s + m.noi, 0) / budgetData.length : 0;
  const t12TotalNOI = t12Data.reduce((s, m) => s + m.noi, 0);
  const t12AvgNOI = t12Data.length ? t12TotalNOI / t12Data.length : 0;

  const noiCompare = t12Data.map((m, i) => ({
    month: m.month.replace(' 20', "'"),
    actual: m.noi,
    budget: budgetData[i]?.noi || budgetAvgNOI,
  }));

  const expiryData = expiryArr.map(e => ({
    year: String(e.year),
    sf: parseFloat((e.sf / 1000).toFixed(1)),
    risk: e.risk || (e.year <= 2026 ? 'critical' : e.year <= 2028 ? 'high' : 'medium'),
  }));

  const nearTerm = active
    .filter(l => l.leaseEnd && l.leaseEnd <= '2030-12-31' && l.sf > 0)
    .sort((a, b) => (a.leaseEnd || '9999').localeCompare(b.leaseEnd || '9999'));

  return { allLeases, active, vacant, budgetAvgNOI, t12TotalNOI, t12AvgNOI, noiCompare, expiryData, nearTerm };
}

// ── OVERVIEW TAB ─────────────────────────────────────────────
function OverviewView({ prop, derived, t12Data, budgetData }) {
  const { noiCompare, expiryData, nearTerm } = derived;
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
        <KPI label="Total SF" value={fmt.sf(prop.totalSF)} highlight />
        <KPI label="Physical Occ." value={fmt.pct(prop.occupancyPct)} />
        <KPI label="Leased" value={fmt.pct(prop.leasedPct)} sub="incl. future leases" />
        <KPI label="Monthly Base Rent" value={fmtM(prop.currentBaseRent)} sub="current tenants" />
        <KPI label="WA Rent PSF" value={`$${prop.waRentPSF}`} />
        <KPI label="WALT" value={`${prop.walt} yrs`} sub="weighted avg lease term" />
      </div>

      {/* Critical alert: Seacoast */}
      <div className="rounded-xl border border-jll-red/40 bg-jll-red/5 p-4 flex items-start gap-3 animate-fade-up">
        <div className="w-8 h-8 rounded-lg bg-jll-red/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-jll-red text-sm font-bold">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-200">Seacoast National Bank — Rent Step-Down May-Oct 2026</p>
          <p className="text-xs text-jll-muted mt-0.5">
            6,254 SF (9.4% of building). Rent drops from $51.03 PSF to $25 PSF for May-Oct 2026,
            reverts to $50 PSF in Nov 2026. ~$81,000 revenue impact during step-down period.
          </p>
        </div>
        <Badge color="red">Critical</Badge>
      </div>

      {/* High alert: Absolute Equity */}
      <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4 flex items-start gap-3 animate-fade-up">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-yellow-400 text-sm font-bold">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-yellow-200">Absolute Equity Managers — Expires 12/31/2026</p>
          <p className="text-xs text-jll-muted mt-0.5">
            1,728 SF Suite 110. No renewal budgeted. Begin retention strategy and renewal conversations immediately.
          </p>
        </div>
        <Badge color="yellow">High</Badge>
      </div>

      {/* Positive alert: Nason Yeager Expansion */}
      <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-4 flex items-start gap-3 animate-fade-up">
        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-green-400 text-sm font-bold">+</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-200">Nason Yeager — Suite 201 Expansion (Apr 2026)</p>
          <p className="text-xs text-jll-muted mt-0.5">
            5,374 SF pre-leased at $38 PSF. $1.07M TI allowance with 3 months free rent.
            Construction underway. Will bring building to 100% physical occupancy.
          </p>
        </div>
        <Badge color="green">Expansion</Badge>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* NOI Actual vs Budget */}
        <div className="rounded-xl border border-jll-border bg-jll-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">NOI — T12 Actual vs 2026 Budget</h3>
          <p className="text-xs text-jll-muted mb-4">Monthly comparison</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={noiCompare}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
              <XAxis dataKey="month" tick={{ fill: '#8A9BB0', fontSize: 10 }} />
              <YAxis tickFormatter={fmtM} tick={{ fill: '#8A9BB0', fontSize: 10 }} />
              <Tooltip formatter={(v, n) => [fmtM(v), n === 'actual' ? 'Actual NOI' : 'Budget NOI']}
                contentStyle={{ background: '#0F2236', border: '1px solid #1E3347', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8A9BB0' }} />
              <Bar dataKey="actual" name="Actual NOI" fill="#4A8FD4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="budget" name="Budget NOI" fill="#1E3347" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lease Expiry Profile */}
        <div className="rounded-xl border border-jll-border bg-jll-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Lease Expiry Profile</h3>
          <p className="text-xs text-jll-muted mb-4">SF expiring by year (000s)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expiryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
              <XAxis dataKey="year" tick={{ fill: '#8A9BB0', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8A9BB0', fontSize: 10 }} unit="K" />
              <Tooltip formatter={(v) => [`${v}K SF`]}
                contentStyle={{ background: '#0F2236', border: '1px solid #1E3347', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sf" radius={[4, 4, 0, 0]}>
                {expiryData.map((e, i) => (
                  <Cell key={i} fill={e.risk === 'critical' ? '#C41230' : e.risk === 'high' ? '#F59E0B' : '#4A8FD4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Near-Term Watch List */}
      <div className="rounded-xl border border-jll-border bg-jll-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Near-Term Expiry Watch List <span className="text-jll-muted font-normal text-xs">— expires by end of 2030</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-jll-muted border-b border-jll-border">
                <th className="text-left pb-2 font-medium">Tenant</th>
                <th className="text-left pb-2 font-medium">Unit</th>
                <th className="text-right pb-2 font-medium">SF</th>
                <th className="text-right pb-2 font-medium">Rent/Mo</th>
                <th className="text-right pb-2 font-medium">PSF</th>
                <th className="text-left pb-2 font-medium">Expiry</th>
                <th className="text-left pb-2 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {nearTerm.map((l, i) => {
                const isCritical = l.leaseEnd <= '2026-12-31';
                const isHigh = l.leaseEnd <= '2028-12-31';
                return (
                  <tr key={i} className="border-b border-jll-border/40 hover:bg-jll-border/10">
                    <td className="py-2 text-white font-medium">{l.tenant}</td>
                    <td className="py-2 font-mono text-jll-muted">{l.unit}</td>
                    <td className="py-2 text-right font-mono text-white">{l.sf?.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-white">${l.monthlyRent?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2 text-right font-mono text-jll-accent">${l.rentPSF?.toFixed(2)}</td>
                    <td className="py-2 font-mono text-white">{l.leaseEnd?.substring(0, 7)}</td>
                    <td className="py-2">
                      {isCritical ? <Badge color="red">Critical</Badge> :
                       isHigh ? <Badge color="yellow">High</Badge> :
                       <Badge color="muted">Monitor</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── LEASING TAB ──────────────────────────────────────────────
function LeasingView({ derived }) {
  const { active: activeLeases, vacant: vacantUnits } = derived;
  const [lTab, setLTab] = useState('active');
  const LTABS = ['active', 'vacant'];

  const sortedActive = [...activeLeases].sort((a, b) => (a.leaseEnd || '9999').localeCompare(b.leaseEnd || '9999'));

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-jll-border/60">
        {LTABS.map(t => (
          <button key={t} onClick={() => setLTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px capitalize ${
              lTab === t ? 'text-jll-accent border-jll-accent' : 'text-jll-muted border-transparent hover:text-white'}`}>
            {t === 'active' ? `Active Leases (${activeLeases.length})` :
             `Vacant (${vacantUnits.length})`}
          </button>
        ))}
      </div>

      {/* Active Leases Table */}
      {lTab === 'active' && (
        <div className="rounded-xl border border-jll-border bg-jll-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-jll-muted border-b border-jll-border bg-jll-navy/50">
                  <th className="text-left p-3 font-medium">Unit</th>
                  <th className="text-left p-3 font-medium">Tenant</th>
                  <th className="text-right p-3 font-medium">SF</th>
                  <th className="text-right p-3 font-medium">Rent/Mo</th>
                  <th className="text-right p-3 font-medium">PSF</th>
                  <th className="text-right p-3 font-medium">CAM/Mo</th>
                  <th className="text-left p-3 font-medium">Expires</th>
                  <th className="text-left p-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sortedActive.map((l, i) => {
                  const expYear = l.leaseEnd?.substring(0, 4);
                  const isCritical = l.sf > 5000 && expYear && expYear <= '2027';
                  const isHigh = expYear && expYear <= '2028';
                  return (
                    <tr key={i} className="border-b border-jll-border/40 hover:bg-jll-border/10 transition-colors">
                      <td className="p-3 font-mono text-jll-muted">{l.unit}</td>
                      <td className="p-3 text-white font-medium">
                        <div>{l.tenant}</div>
                        {l.notes && <div className="text-jll-muted font-normal mt-0.5 text-xs max-w-xs truncate">{l.notes}</div>}
                      </td>
                      <td className="p-3 text-right font-mono text-white">{l.sf > 0 ? l.sf.toLocaleString() : '--'}</td>
                      <td className="p-3 text-right font-mono text-white">${l.monthlyRent?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right font-mono text-jll-accent">{l.rentPSF > 0 ? `$${l.rentPSF.toFixed(2)}` : '--'}</td>
                      <td className="p-3 text-right font-mono text-jll-muted">{l.camMonthly > 0 ? `$${l.camMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}</td>
                      <td className="p-3 font-mono text-white">{l.leaseEnd ? l.leaseEnd.substring(0, 7) : 'MTM'}</td>
                      <td className="p-3">
                        {l.sf === 0 ? <Badge color="muted">Non-SF</Badge> :
                         isCritical ? <Badge color="red">Critical</Badge> :
                         isHigh ? <Badge color="yellow">High</Badge> :
                         <Badge color="teal">Stable</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-jll-border bg-jll-navy/30">
                  <td colSpan={2} className="p-3 text-jll-muted font-semibold">TOTALS</td>
                  <td className="p-3 text-right font-mono text-white font-bold">
                    {activeLeases.filter(l => l.sf > 0).reduce((s, l) => s + (l.sf || 0), 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-white font-bold">
                    ${activeLeases.reduce((s, l) => s + (l.monthlyRent || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-3" />
                  <td className="p-3 text-right font-mono text-white font-bold">
                    ${activeLeases.reduce((s, l) => s + (l.camMonthly || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Vacant */}
      {lTab === 'vacant' && (
        <div className="rounded-xl border border-jll-border bg-jll-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-jll-muted border-b border-jll-border bg-jll-navy/50">
                <th className="text-left p-3 font-medium">Unit</th>
                <th className="text-right p-3 font-medium">SF</th>
                <th className="text-left p-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {vacantUnits.map((l, i) => (
                <tr key={i} className="border-b border-jll-border/40">
                  <td className="p-3 font-mono text-jll-muted">{l.unit}</td>
                  <td className="p-3 text-right font-mono text-jll-red">{l.sf?.toLocaleString()}</td>
                  <td className="p-3 text-white">{l.notes || '--'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-jll-border bg-jll-navy/30">
                <td className="p-3 text-jll-muted font-semibold">TOTAL VACANT SF</td>
                <td className="p-3 text-right font-mono text-jll-red font-bold">
                  {vacantUnits.reduce((s, l) => s + (l.sf || 0), 0).toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── FINANCIALS TAB ───────────────────────────────────────────
function FinancialsView({ t12Data, budgetData, derived }) {
  const { t12TotalNOI, t12AvgNOI, budgetAvgNOI } = derived;

  return (
    <div className="space-y-5">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <KPI label="T12 NOI" value={fmtM1(t12TotalNOI)} sub="trailing 12 months" highlight />
        <KPI label="Avg Monthly NOI" value={fmtM1(t12AvgNOI)} sub="T12 average" />
        <KPI label="2026 Budget NOI" value={fmtM1(budgetData.reduce((s, m) => s + m.noi, 0))} sub="annual target" />
        <KPI label="Budget Avg/Mo" value={fmtM1(budgetAvgNOI)} sub="monthly target" />
      </div>

      {/* Actual vs Budget Comparison */}
      <div className="rounded-xl border border-jll-border bg-jll-card overflow-hidden">
        <div className="p-4 border-b border-jll-border">
          <h3 className="text-sm font-semibold text-white">T12 Monthly Performance</h3>
          <p className="text-xs text-jll-muted mt-0.5">Actual vs 2026 Budget comparison</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-jll-muted border-b border-jll-border bg-jll-navy/50">
                <th className="text-left p-3 font-medium">Month</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-right p-3 font-medium">Expenses</th>
                <th className="text-right p-3 font-medium">NOI</th>
                <th className="text-right p-3 font-medium">Budget NOI</th>
                <th className="text-right p-3 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {t12Data.map((m, i) => {
                const bNoi = budgetData[i]?.noi || budgetAvgNOI;
                const variance = m.noi - bNoi;
                return (
                  <tr key={i} className="border-b border-jll-border/40 hover:bg-jll-border/10">
                    <td className="p-3 text-white font-medium">{m.month}</td>
                    <td className="p-3 text-right font-mono text-white">{fmtM(m.revenue)}</td>
                    <td className="p-3 text-right font-mono text-jll-muted">{fmtM(m.expenses)}</td>
                    <td className="p-3 text-right font-mono text-jll-accent font-semibold">{fmtM(m.noi)}</td>
                    <td className="p-3 text-right font-mono text-jll-muted">{fmtM(bNoi)}</td>
                    <td className={`p-3 text-right font-mono ${variance >= 0 ? 'text-green-400' : 'text-jll-red'}`}>
                      {variance >= 0 ? '+' : ''}{fmtM(variance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-jll-border bg-jll-navy/30 font-semibold">
                <td className="p-3 text-white">TOTAL</td>
                <td className="p-3 text-right font-mono text-white">{fmtM(t12Data.reduce((s, m) => s + m.revenue, 0))}</td>
                <td className="p-3 text-right font-mono text-jll-muted">{fmtM(t12Data.reduce((s, m) => s + m.expenses, 0))}</td>
                <td className="p-3 text-right font-mono text-jll-accent">{fmtM(t12TotalNOI)}</td>
                <td className="p-3 text-right font-mono text-jll-muted">{fmtM(budgetData.reduce((s, m) => s + m.noi, 0))}</td>
                <td className={`p-3 text-right font-mono ${t12TotalNOI - budgetData.reduce((s, m) => s + m.noi, 0) >= 0 ? 'text-green-400' : 'text-jll-red'}`}>
                  {t12TotalNOI - budgetData.reduce((s, m) => s + m.noi, 0) >= 0 ? '+' : ''}
                  {fmtM(t12TotalNOI - budgetData.reduce((s, m) => s + m.noi, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2026 Budget Breakdown */}
      <div className="rounded-xl border border-jll-border bg-jll-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">2026 Budget Monthly NOI</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={budgetData.map(m => ({ month: m.month.replace(' 2026', '').replace('20', "'"), noi: m.noi, income: m.income, expenses: m.expenses }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
            <XAxis dataKey="month" tick={{ fill: '#8A9BB0', fontSize: 10 }} />
            <YAxis tickFormatter={fmtM} tick={{ fill: '#8A9BB0', fontSize: 10 }} />
            <Tooltip formatter={(v, n) => [fmtM(v), n]}
              contentStyle={{ background: '#0F2236', border: '1px solid #1E3347', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8A9BB0' }} />
            <Bar dataKey="income" name="Income" fill="#4A8FD4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#C41230" radius={[4, 4, 0, 0]} />
            <Bar dataKey="noi" name="NOI" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── EVENTS TAB ───────────────────────────────────────────────
function EventsView({ events: liveEvents }) {
  const events = liveEvents || [
    { date: '2026-04-01', type: 'Lease Start', tenant: 'Nason Yeager (Suite 201 Expansion)', unit: '201', priority: 'high',
      description: '5,374 SF expansion at $38 PSF. $1.07M TI allowance. 3 months free rent. Construction in progress.' },
    { date: '2026-05-01', type: 'Rent Adjustment', tenant: 'Seacoast National Bank', unit: '100', priority: 'critical',
      description: 'Rent drops from $51.03 PSF to $25 PSF for May-Oct 2026 per lease terms. ~$81K revenue impact.' },
    { date: '2026-11-01', type: 'Rent Adjustment', tenant: 'Seacoast National Bank', unit: '100', priority: 'high',
      description: 'Rent reverts to $50 PSF effective November 2026.' },
    { date: '2026-12-31', type: 'Lease Expiry', tenant: 'Absolute Equity Managers, LLC', unit: '110', priority: 'critical',
      description: '1,728 SF expiring. No renewal in budget. Initiate renewal conversations immediately.' },
    { date: '2027-06-30', type: 'Lease Expiry', tenant: 'CenturyLink Communications', unit: 'FIBER1', priority: 'medium',
      description: 'Fiber lease expiry. $350/mo. Minimal financial impact.' },
    { date: '2028-07-31', type: 'Lease Expiry', tenant: 'Mariner Wealth Advisors', unit: '101B', priority: 'medium',
      description: '2,306 SF at $37.13 PSF. Monitor for renewal.' },
    { date: '2028-08-31', type: 'Lease Expiry', tenant: 'McNicholas & Associates', unit: '300', priority: 'medium',
      description: '5,000 SF at $30.16 PSF on 3rd floor. Begin renewal discussions 12 months prior.' },
    { date: '2028-10-31', type: 'Lease Expiry', tenant: 'Cummings & Lockwood LLC', unit: '104', priority: 'medium',
      description: '4,343 SF at $31.51 PSF. Begin renewal discussions 12 months prior.' },
    { date: '2028-12-31', type: 'Lease Expiry', tenant: 'Prime Orthostem Solutions', unit: '101', priority: 'medium',
      description: '1,837 SF at $37.13 PSF. 3% annual escalations.' },
  ];

  const priorityColor = { critical: 'red', high: 'yellow', medium: 'teal' };
  const typeColor = { 'Lease Start': 'green', 'Lease Expiry': 'red', 'Rent Adjustment': 'orange' };

  return (
    <div className="space-y-4">
      <p className="text-xs text-jll-muted">Key lease events requiring action — sorted by date</p>
      {events.map((e, i) => (
        <div key={i} className="rounded-xl border border-jll-border bg-jll-card p-5 hover:border-jll-teal/30 transition-all animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge color={typeColor[e.type] || 'muted'}>{e.type}</Badge>
                <Badge color={priorityColor[e.priority] || 'muted'}>{e.priority}</Badge>
                <span className="text-xs text-jll-muted">Suite {e.unit}</span>
              </div>
              <p className="text-sm font-semibold text-white">{e.tenant}</p>
              <p className="text-xs text-jll-muted mt-1">{e.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-mono font-bold text-white">{e.date.substring(0, 7)}</p>
              <p className="text-xs text-jll-muted">{e.date}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DATA TAB ─────────────────────────────────────────────────
function DataView({ dataMode, uploadHistory, onRefresh }) {
  const typeLabel = { management_report: 'Management Report', rent_roll: 'Rent Roll', budget: 'Budget' };
  const typeIcon = { management_report: '📊', rent_roll: '📋', budget: '💰' };

  return (
    <div className="space-y-6">
      {/* Header with connection indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Upload & Manage Data</h2>
          <p className="text-xs text-jll-muted">Upload monthly financials, rent rolls, and budgets. AI extracts and structures the data automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            dataMode === 'live'
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dataMode === 'live' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {dataMode === 'live' ? 'Live' : 'Demo'}
          </span>
          <button onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg border border-jll-accent/40 bg-jll-accent/10 text-jll-accent text-xs font-semibold hover:bg-jll-accent/20 transition-all">
            Refresh
          </button>
        </div>
      </div>

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <div className="rounded-xl border border-jll-border bg-jll-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Upload History</h3>
          <div className="space-y-2">
            {uploadHistory.map((u, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-jll-border/60 bg-jll-navy/30">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{typeIcon[u.upload_type] || '📄'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium">{u.file_name || 'Initial seed'}</p>
                      {u.is_active && <Badge color="teal">Active</Badge>}
                    </div>
                    <p className="text-xs text-jll-muted mt-0.5">
                      {typeLabel[u.upload_type] || u.upload_type} · {new Date(u.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('overview');
  const [aiOpen, setAiOpen] = useState(false);

  // State: property data with Supabase override
  const [prop, setProp] = useState(staticData);
  const [leases, setLeases] = useState(staticData.leases);
  const [t12Data, setT12Data] = useState(staticData.t12Statement);
  const [budgetData, setBudgetData] = useState(staticData.budget2026);
  const [expiryArr, setExpiryArr] = useState(staticData.expiryProfile);
  const [events, setEvents] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [dataMode, setDataMode] = useState('local');

  const refreshData = useCallback(async () => {
    if (!isConnected()) return;
    try {
      const [p, t12, rr, bud, ev, exp, hist] = await Promise.all([
        getPortfolio(),
        getT12Monthly(),
        getRentRoll(),
        getBudget(),
        getLeaseEvents(),
        getExpiryProfile(),
        getUploadHistory(),
      ]);
      if (p) setProp(prev => ({ ...prev, ...p }));
      if (t12) setT12Data(t12);
      if (rr) setLeases(rr);
      if (bud) setBudgetData(bud);
      if (ev) setEvents(ev);
      if (exp) setExpiryArr(exp);
      if (hist) setUploadHistory(hist);
      setDataMode('live');
    } catch (e) {
      console.warn('Supabase fetch failed, using static data:', e);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Handlers for DataUpload AI extraction results
  const handleReportExtracted = useCallback(async (filename, result) => {
    if (!isConnected()) return;
    const { portfolio, t12Rows } = result;
    await insertManagementReport({ filename, t12Rows, portfolio });
    refreshData();
  }, [refreshData]);

  const handleRentRollExtracted = useCallback(async (filename, result) => {
    if (!isConnected()) return;
    const { rows } = result;
    await insertRentRoll({ filename, rows });
    refreshData();
  }, [refreshData]);

  const handleBudgetExtracted = useCallback(async (filename, result) => {
    if (!isConnected()) return;
    const { rows } = result;
    await insertBudget({ filename, rows });
    refreshData();
  }, [refreshData]);

  // Derive computed values from current state
  const derived = deriveData(prop, leases, t12Data, budgetData, expiryArr);

  // Dashboard state object for AI context
  const dashboardState = { prop, leases, t12Data, budgetData, expiryArr, events };

  return (
    <div className="min-h-screen bg-jll-navy font-body">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-jll-border/80 bg-jll-navy/90 backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-lg tracking-tight">CRE</span>
              <span className="text-jll-accent font-bold text-lg tracking-tight">lytic</span>
            </div>
            <span className="text-jll-border">|</span>
            <span className="text-white font-semibold text-sm tracking-wide">Spotlight</span>
            <span className={`text-xs border rounded px-1.5 py-0.5 ${
              dataMode === 'live'
                ? 'text-green-300 border-green-500/40'
                : 'text-yellow-300 border-yellow-500/40'
            }`}>
              {dataMode === 'live' ? 'LIVE' : 'DEMO'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-jll-muted">As of</p>
              <p className="text-xs text-white font-mono">2026-01-31</p>
            </div>
            <button onClick={() => setAiOpen(true)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-jll-accent/40 bg-jll-accent/10 text-jll-accent text-xs font-semibold hover:bg-jll-accent/20 transition-all">
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-jll-accent animate-pulse-ring" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6 relative">
        {/* Title */}
        <div className="mb-6">
          <p className="text-xs text-jll-muted uppercase tracking-widest mb-1">{prop.entity}</p>
          <h1 className="text-3xl font-display text-white">{prop.name}</h1>
          <p className="text-sm text-jll-muted mt-1">
            {prop.address}, {prop.city} {prop.state} {prop.zip} — Powered by CRElytic Spotlight
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-jll-border/60">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                tab === t.id ? 'text-jll-accent border-jll-accent' : 'text-jll-muted border-transparent hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && <OverviewView prop={prop} derived={derived} t12Data={t12Data} budgetData={budgetData} />}
        {tab === 'leasing' && <LeasingView derived={derived} />}
        {tab === 'financials' && <FinancialsView t12Data={t12Data} budgetData={budgetData} derived={derived} />}
        {tab === 'events' && <EventsView events={events} />}
        {tab === 'data' && (
          <div className="space-y-6">
            <DataView dataMode={dataMode} uploadHistory={uploadHistory} onRefresh={refreshData} />
            <DataUpload onReportExtracted={handleReportExtracted} onRentRollExtracted={handleRentRollExtracted} onBudgetExtracted={handleBudgetExtracted} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-jll-border/40 text-center">
          <p className="text-xs text-jll-muted max-w-3xl mx-auto">
            <strong className="text-white">Disclaimer:</strong> This dashboard is for property management and investor reporting purposes only.
            Not for use in investment, legal, or public reporting decisions without independent verification. CRElytic Spotlight is a product of CRElytic.
          </p>
          <p className="text-xs text-jll-border mt-2">&copy; 2026 CRElytic — Spotlight Platform</p>
        </footer>
      </main>

      {/* AI Assistant Panel */}
      <AskAIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        activeTab={tab}
        dashboardState={dashboardState}
      />
    </div>
  );
}

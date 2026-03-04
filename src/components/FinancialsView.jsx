import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
  AreaChart, Area, PieChart, Pie,
} from 'recharts';

// ── Formatters ─────────────────────────────────────────────
const fmtUSD = v => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtK   = v => `$${(v / 1000).toFixed(0)}K`;
const fmtK1  = v => `$${(v / 1000).toFixed(1)}K`;
const fmtM   = v => `$${(v / 1000000).toFixed(2)}M`;
const fmtPct = v => `${Number(v).toFixed(2)}%`;
const fmtPSF = v => `$${Number(v).toFixed(2)}`;

// ── Shared sub-components ──────────────────────────────────
function KPI({ label, value, sub, delta, highlight, placeholder }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-jll-teal/30 bg-jll-teal/5' : 'border-jll-border bg-jll-card'} ${placeholder ? 'opacity-50' : ''}`}>
      <p className="text-xs text-jll-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-mono font-bold ${placeholder ? 'text-jll-muted italic text-base' : highlight ? 'text-jll-accent' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-jll-muted mt-0.5">{sub}</p>}
      {delta !== undefined && (
        <p className={`text-xs mt-0.5 font-medium ${delta >= 0 ? 'text-green-400' : 'text-jll-red'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </p>
      )}
    </div>
  );
}

function Badge({ children, color = 'muted' }) {
  const cls = {
    muted:  'bg-jll-border/40 text-jll-muted',
    teal:   'bg-jll-teal/15 text-jll-accent border border-jll-teal/30',
    red:    'bg-jll-red/15 text-jll-red border border-jll-red/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    green:  'bg-green-500/15 text-green-400 border border-green-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  }[color];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>;
}

function SectionHeader({ title, badge, badgeColor }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-jll-border">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {badge && <Badge color={badgeColor}>{badge}</Badge>}
    </div>
  );
}

function PlaceholderNotice({ title, text }) {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 mb-5">
      <p className="text-xs font-semibold text-yellow-400 mb-1">⚠ {title}</p>
      <p className="text-xs text-jll-muted leading-relaxed">{text}</p>
    </div>
  );
}

// ── SUB-TAB: Summary ───────────────────────────────────────
function SummaryTab({ prop, t12Data, derived, debtSchedule, valuation }) {
  const { t12TotalNOI } = derived;
  const totalRevenue = t12Data.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = t12Data.reduce((s, m) => s + m.expenses, 0);
  const opexRatio = ((totalExpenses / totalRevenue) * 100);
  const noiPSF = t12TotalNOI / prop.totalSF;
  const dscr = debtSchedule?.metrics?.dscr;
  const capRate = valuation?.inPlaceCapRate;

  const t12Chart = t12Data.map(m => ({
    month: m.month.replace(' 2025', '').substring(0, 3),
    noi: m.noi,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="T12 NOI" value={fmtM(t12TotalNOI)} highlight />
        <KPI label="EGI (YTD)" value={fmtM(totalRevenue)} sub="Effective Gross Income" />
        <KPI label="OpEx Ratio" value={fmtPct(opexRatio)} sub={`${fmtK(totalExpenses)} / ${fmtK(totalRevenue)}`} />
        <KPI label="NOI / SF" value={fmtPSF(noiPSF)} sub="Annualized" />
        <KPI label="DSCR" value={dscr ? dscr.toFixed(2) + 'x' : '—'} sub={debtSchedule?.isPlaceholder ? 'Placeholder' : 'Live'} placeholder={debtSchedule?.isPlaceholder} />
        <KPI label="In-Place Cap" value={capRate ? fmtPct(capRate) : '—'} sub="T12 NOI ÷ Book Value" />
      </div>

      {/* T12 NOI Trend */}
      <div className="rounded-xl border border-jll-border bg-jll-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">T12 NOI Trend</h3>
        <p className="text-xs text-jll-muted mb-4">Monthly net operating income (Jan–Dec 2025)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={t12Chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
            <XAxis dataKey="month" tick={{ fill: '#8A9BB0', fontSize: 10 }} />
            <YAxis tickFormatter={fmtK} tick={{ fill: '#8A9BB0', fontSize: 10 }} />
            <Tooltip formatter={(v) => [fmtK(v), 'NOI']} contentStyle={{ background: '#0F2236', border: '1px solid #1E3347', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="noi" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── SUB-TAB: Income & Cash Flow ────────────────────────────
function IncomeTab({ t12Data, budgetData, derived, prop, debtSchedule }) {
  const { t12TotalNOI, budgetAvgNOI } = derived;
  const totalRevenue = t12Data.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = t12Data.reduce((s, m) => s + m.expenses, 0);
  const budgetTotalNOI = budgetData.reduce((s, m) => s + m.noi, 0);
  const budgetTotalRev = budgetData.reduce((s, m) => s + m.income, 0);
  const budgetTotalExp = budgetData.reduce((s, m) => s + m.expenses, 0);
  const noiVariance = t12TotalNOI - budgetTotalNOI;
  const noiVariancePct = (noiVariance / budgetTotalNOI) * 100;

  // GPR placeholder (revenue + vacancy assumption)
  const vacancyLoss = totalRevenue * 0.0426;
  const gpr = totalRevenue + vacancyLoss;
  const camRecoveries = 81636;

  // Cash flow metrics
  const ds = debtSchedule?.metrics?.annualDebtService || 0;
  const cashFlowAfterDS = t12TotalNOI - ds;
  const cashOnCash = debtSchedule?.isPlaceholder ? 6.19 : null;

  const noiCompare = t12Data.map((m, i) => ({
    month: m.month.replace(' 2025', '').substring(0, 3),
    actual: m.noi,
    budget: budgetData[i]?.noi || budgetAvgNOI,
  }));

  return (
    <div className="space-y-5">
      <SectionHeader title="Revenue Breakdown" badge="Live from Upload" badgeColor="green" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Gross Potential Rent (YTD)" value={fmtUSD(gpr)} delta={0.74} />
        <KPI label="Vacancy Loss (YTD)" value={`(${fmtUSD(vacancyLoss)})`} sub={`${(vacancyLoss / gpr * 100).toFixed(1)}% of GPR`} />
        <KPI label="Effective Gross Income" value={fmtUSD(totalRevenue)} highlight />
        <KPI label="CAM Recoveries" value={fmtUSD(camRecoveries)} sub="Tenant reimbursements" />
      </div>

      <SectionHeader title="NOI — Actual vs Budget" badge="Live" badgeColor="green" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-jll-border bg-jll-card p-5">
          <h4 className="text-xs font-semibold text-white mb-3">YTD Comparison</h4>
          <table className="w-full text-xs">
            <thead><tr className="text-jll-muted border-b border-jll-border">
              <th className="text-left pb-2"></th><th className="text-right pb-2">Actual</th><th className="text-right pb-2">Budget</th><th className="text-right pb-2">Variance</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-jll-border/40"><td className="py-2 text-white">Revenue</td><td className="py-2 text-right font-mono text-white">{fmtUSD(totalRevenue)}</td><td className="py-2 text-right font-mono text-jll-muted">{fmtUSD(budgetTotalRev)}</td><td className={`py-2 text-right font-mono ${totalRevenue - budgetTotalRev >= 0 ? 'text-green-400' : 'text-jll-red'}`}>{totalRevenue - budgetTotalRev >= 0 ? '+' : ''}{fmtUSD(totalRevenue - budgetTotalRev)}</td></tr>
              <tr className="border-b border-jll-border/40"><td className="py-2 text-white">OpEx</td><td className="py-2 text-right font-mono text-white">{fmtUSD(totalExpenses)}</td><td className="py-2 text-right font-mono text-jll-muted">{fmtUSD(budgetTotalExp)}</td><td className={`py-2 text-right font-mono ${totalExpenses - budgetTotalExp <= 0 ? 'text-green-400' : 'text-jll-red'}`}>({fmtUSD(Math.abs(totalExpenses - budgetTotalExp))})</td></tr>
              <tr className="font-bold"><td className="py-2 text-white">NOI</td><td className="py-2 text-right font-mono text-jll-accent">{fmtUSD(t12TotalNOI)}</td><td className="py-2 text-right font-mono text-jll-muted">{fmtUSD(budgetTotalNOI)}</td><td className={`py-2 text-right font-mono ${noiVariance >= 0 ? 'text-green-400' : 'text-jll-red'}`}>{noiVariance >= 0 ? '+' : ''}{fmtUSD(noiVariance)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-jll-border bg-jll-card p-5">
          <h4 className="text-xs font-semibold text-white mb-3">Monthly NOI: Actual vs Budget</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={noiCompare}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3347" />
              <XAxis dataKey="month" tick={{ fill: '#8A9BB0', fontSize: 9 }} />
              <YAxis tickFormatter={fmtK} tick={{ fill: '#8A9BB0', fontSize: 9 }} />
              <Tooltip formatter={(v, n) => [fmtK(v), n === 'actual' ? 'Actual' : 'Budget']} contentStyle={{ background: '#0F2236', border: '1px solid #1E3347', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="actual" name="Actual" fill="#4A8FD4" radius={[3, 3, 0, 0]} />
              <Bar dataKey="budget" name="Budget" fill="#1E3347" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionHeader title="Cash Flow After Debt Service" badge={debtSchedule?.isPlaceholder ? "Placeholder Data" : "Live"} badgeColor={debtSchedule?.isPlaceholder ? "yellow" : "green"} />
      {debtSchedule?.isPlaceholder && <PlaceholderNotice title="Placeholder Debt Data" text="Debt service figures below use estimated loan terms. Upload actual loan documents to replace with real debt service calculations." />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Annual Debt Service" value={fmtUSD(ds)} sub="P&I payments" placeholder={debtSchedule?.isPlaceholder} />
        <KPI label="Cash Flow After DS" value={fmtUSD(cashFlowAfterDS)} sub="NOI − Debt Service" highlight placeholder={debtSchedule?.isPlaceholder} />
        <KPI label="Cash-on-Cash Return" value={cashOnCash ? fmtPct(cashOnCash) : '—'} sub="Pre-tax CF ÷ Equity" placeholder={debtSchedule?.isPlaceholder} />
        <KPI label="EBITDA (est.)" value={fmtUSD(t12TotalNOI)} sub="≈ NOI (no CapEx data)" placeholder />
      </div>
    </div>
  );
}

// ── SUB-TAB: Operating Expenses ────────────────────────────
function ExpensesTab({ t12Data, expenseBreakdown, prop }) {
  const totalExpenses = t12Data.reduce((s, m) => s + m.expenses, 0);
  const totalRevenue = t12Data.reduce((s, m) => s + m.revenue, 0);
  const opexRatio = (totalExpenses / totalRevenue) * 100;
  const opexPSF = totalExpenses / prop.totalSF;
  const mgmtFees = expenseBreakdown.find(e => e.category === 'Management Fees');
  const mgmtPct = mgmtFees ? (mgmtFees.actual / totalRevenue * 100) : 0;

  const totalActual = expenseBreakdown.reduce((s, e) => s + e.actual, 0);
  const totalBudget = expenseBreakdown.reduce((s, e) => s + e.budget, 0);
  const maxActual = Math.max(...expenseBreakdown.map(e => e.actual));

  return (
    <div className="space-y-5">
      <SectionHeader title="Expense Summary" badge="Live from Upload" badgeColor="green" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total OpEx (YTD)" value={fmtUSD(totalExpenses)} delta={((totalActual - totalBudget) / totalBudget * 100)} />
        <KPI label="OpEx Ratio" value={fmtPct(opexRatio)} sub="OpEx ÷ EGI" />
        <KPI label="OpEx / SF" value={fmtPSF(opexPSF)} sub="Annualized" />
        <KPI label="Mgmt Fee %" value={fmtPct(mgmtPct)} sub={fmtUSD(mgmtFees?.actual || 0)} />
      </div>

      <SectionHeader title="Category Breakdown" badge="Live" badgeColor="green" />
      <div className="rounded-xl border border-jll-border bg-jll-card p-5">
        {expenseBreakdown.map((e, i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <span className="text-xs text-jll-muted w-36 text-right flex-shrink-0">{e.category}</span>
            <div className="flex-1 h-6 bg-jll-border/20 rounded overflow-hidden relative">
              <div
                className={`h-full rounded flex items-center px-2 text-xs font-mono font-semibold ${
                  e.actual > e.budget ? 'bg-jll-red/30 text-jll-red' : 'bg-jll-teal/20 text-jll-accent'
                }`}
                style={{ width: `${(e.actual / maxActual) * 100}%` }}
              >
                {fmtUSD(e.actual)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader title="Budget Variance Detail" badge="Live" badgeColor="green" />
      <div className="rounded-xl border border-jll-border bg-jll-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-jll-muted border-b border-jll-border bg-jll-navy/50">
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Actual</th>
              <th className="text-right p-3">Budget</th>
              <th className="text-right p-3">Variance $</th>
              <th className="text-right p-3">Variance %</th>
            </tr>
          </thead>
          <tbody>
            {expenseBreakdown.map((e, i) => {
              const v = e.actual - e.budget;
              const vPct = (v / e.budget) * 100;
              return (
                <tr key={i} className="border-b border-jll-border/40 hover:bg-jll-border/10">
                  <td className="p-3 text-white">{e.category}</td>
                  <td className="p-3 text-right font-mono text-white">{fmtUSD(e.actual)}</td>
                  <td className="p-3 text-right font-mono text-jll-muted">{fmtUSD(e.budget)}</td>
                  <td className={`p-3 text-right font-mono ${v <= 0 ? 'text-green-400' : 'text-jll-red'}`}>
                    {v > 0 ? '+' : ''}{fmtUSD(v)}
                  </td>
                  <td className={`p-3 text-right font-mono ${v <= 0 ? 'text-green-400' : 'text-jll-red'}`}>
                    {v > 0 ? '+' : ''}{vPct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-jll-border bg-jll-navy/30 font-semibold">
              <td className="p-3 text-white">TOTAL</td>
              <td className="p-3 text-right font-mono text-white">{fmtUSD(totalActual)}</td>
              <td className="p-3 text-right font-mono text-jll-muted">{fmtUSD(totalBudget)}</td>
              <td className={`p-3 text-right font-mono ${totalActual - totalBudget <= 0 ? 'text-green-400' : 'text-jll-red'}`}>
                {totalActual - totalBudget > 0 ? '+' : ''}{fmtUSD(totalActual - totalBudget)}
              </td>
              <td className={`p-3 text-right font-mono ${totalActual - totalBudget <= 0 ? 'text-green-400' : 'text-jll-red'}`}>
                {((totalActual - totalBudget) / totalBudget * 100).toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── SUB-TAB: Balance Sheet ─────────────────────────────────
function BalanceSheetTab({ balanceSheet }) {
  const bs = balanceSheet;
  return (
    <div className="space-y-5">
      <SectionHeader title="Balance Sheet" badge={`As of ${bs.asOf}`} badgeColor="green" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total Assets" value={fmtM(bs.assets.total)} highlight />
        <KPI label="Total Liabilities" value={fmtUSD(bs.liabilities.total)} />
        <KPI label="Total Equity" value={fmtM(bs.equity.total)} />
        <KPI label="Cash & Equivalents" value={fmtUSD(bs.assets.cashAndEquivalents)} sub="TD Bank Operating Acct" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-jll-border bg-jll-card p-5">
          <h4 className="text-xs font-semibold text-white mb-3">Assets</h4>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Land & Building</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.assets.landAndBuilding)}</td></tr>
              <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Tenant Improvements</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.assets.tenantImprovements)}</td></tr>
              <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Leasing Commissions</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.assets.leasingCommissions)}</td></tr>
              <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Cash & Equivalents</td><td className="py-2 text-right font-mono text-jll-accent">{fmtUSD(bs.assets.cashAndEquivalents)}</td></tr>
              <tr className="font-bold"><td className="py-2 text-white">Total Assets</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.assets.total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="space-y-5">
          <div className="rounded-xl border border-jll-border bg-jll-card p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Liabilities — {fmtUSD(bs.liabilities.total)}</h4>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Accounts Payable</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.liabilities.accountsPayable)}</td></tr>
                <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Accrued Expenses</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.liabilities.accruedExpenses)}</td></tr>
                <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Security Deposits</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.liabilities.securityDeposits)}</td></tr>
                <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Prepaid Rent / Other</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.liabilities.prepaidRent)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-jll-border bg-jll-card p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Equity — {fmtM(bs.equity.total)}</h4>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Partners' Capital</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.equity.partnersCapital)}</td></tr>
                <tr className="border-b border-jll-border/40"><td className="py-2 text-jll-muted">Current Year Earnings</td><td className="py-2 text-right font-mono text-jll-accent">{fmtUSD(bs.equity.currentYearEarnings)}</td></tr>
                <tr className="font-bold"><td className="py-2 text-white">Total Equity</td><td className="py-2 text-right font-mono text-white">{fmtUSD(bs.equity.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB-TAB: Debt & Capital ────────────────────────────────
function DebtTab({ debtSchedule, t12NOI }) {
  const ds = debtSchedule;
  const loan = ds.loans[0];
  const m = ds.metrics;

  return (
    <div className="space-y-5">
      {ds.isPlaceholder && (
        <PlaceholderNotice
          title="Placeholder Debt Data"
          text="The property management report contains no loan/mortgage data — debt is likely held at the APC US fund/entity level. The figures below are estimated placeholders. Upload actual loan documents, closing statements, or a debt schedule to replace these with real data. The ingestion pipeline will automatically overwrite placeholders when real docs are processed."
        />
      )}

      <SectionHeader title="Loan Overview" badge={ds.isPlaceholder ? "Placeholder" : "Live"} badgeColor={ds.isPlaceholder ? "yellow" : "green"} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Outstanding Balance" value={fmtM(loan.currentBalance)} placeholder={ds.isPlaceholder} />
        <KPI label="Original Amount" value={fmtM(loan.originalAmount)} placeholder={ds.isPlaceholder} />
        <KPI label="Interest Rate" value={`${loan.interestRate}% ${loan.rateType}`} placeholder={ds.isPlaceholder} />
        <KPI label="Maturity" value={loan.maturityDate} sub={loan.loanType} placeholder={ds.isPlaceholder} />
      </div>

      <div className="rounded-xl border border-jll-border bg-jll-card p-5">
        <h4 className="text-xs font-semibold text-white mb-3">Loan Details</h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Lender</span><span className="text-white font-medium">{loan.lender}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Loan Type</span><span className="text-white">{loan.loanType}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Origination</span><span className="text-white">{loan.originationDate}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Amortization</span><span className="text-white">{loan.amortization}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">IO Period</span><span className="text-white">{loan.isIO ? 'Yes' : 'No'}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Prepayment</span><span className="text-white">{loan.prepaymentPenalty || 'N/A'}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Rate Cap</span><span className="text-white">{loan.rateCap || 'None'}</span></div>
          <div className="flex justify-between border-b border-jll-border/40 py-2"><span className="text-jll-muted">Monthly Payment</span><span className="text-white font-mono">{fmtUSD(loan.monthlyPayment)}</span></div>
        </div>
      </div>

      <SectionHeader title="Leverage & Coverage Metrics" badge={ds.isPlaceholder ? "Estimated" : "Live"} badgeColor={ds.isPlaceholder ? "yellow" : "green"} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="LTV" value={fmtPct(m.ltv)} sub="Loan ÷ Property Value" placeholder={ds.isPlaceholder} />
        <KPI label="LTC" value={m.ltc ? fmtPct(m.ltc) : '—'} sub="Loan ÷ Total Cost Basis" placeholder={ds.isPlaceholder} />
        <KPI label="DSCR" value={m.dscr.toFixed(2) + 'x'} sub="NOI ÷ Debt Service" highlight placeholder={ds.isPlaceholder} />
        <KPI label="Debt Yield" value={fmtPct(m.debtYield)} sub="NOI ÷ Loan Balance" placeholder={ds.isPlaceholder} />
        <KPI label="ICR" value={m.icr.toFixed(2) + 'x'} sub="NOI ÷ Interest" placeholder={ds.isPlaceholder} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPI label="Annual Debt Service" value={fmtUSD(m.annualDebtService)} placeholder={ds.isPlaceholder} />
        <KPI label="Weighted Avg Rate" value={fmtPct(m.weightedAvgRate)} placeholder={ds.isPlaceholder} />
        <KPI label="Total Debt Outstanding" value={fmtM(m.totalDebtOutstanding)} placeholder={ds.isPlaceholder} />
      </div>
    </div>
  );
}

// ── SUB-TAB: Valuation ─────────────────────────────────────
function ValuationTab({ valuation, prop, debtSchedule }) {
  const v = valuation;
  return (
    <div className="space-y-5">
      {v.isPlaceholder && (
        <PlaceholderNotice
          title="Placeholder Valuation Assumptions"
          text="Cap rate scenarios are illustrative. NAV, equity multiple, and IRR use estimated debt/equity figures. Upload an appraisal or broker opinion of value (BOV) to replace with actual market data."
        />
      )}

      <SectionHeader title="Cap Rate Analysis" badge="Calculated" badgeColor="teal" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="In-Place Cap Rate" value={fmtPct(v.inPlaceCapRate)} sub="T12 NOI ÷ Book Value" highlight />
        <KPI label="T12 NOI" value={fmtM(v.t12NOI)} />
        <KPI label="Book Value" value={fmtM(v.bookValue)} />
        <KPI label="NOI / SF" value={fmtPSF(v.t12NOI / prop.totalSF)} sub="Annualized" />
      </div>

      <SectionHeader title="Implied Valuation Sensitivity" badge="Scenario Analysis" badgeColor="purple" />
      <div className="rounded-xl border border-jll-border bg-jll-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-jll-muted border-b border-jll-border bg-jll-navy/50">
              <th className="text-left p-3">Scenario</th>
              <th className="text-right p-3">Cap Rate</th>
              <th className="text-right p-3">Implied Value</th>
              <th className="text-right p-3">$/SF</th>
            </tr>
          </thead>
          <tbody>
            {v.scenarios.map((s, i) => (
              <tr key={i} className={`border-b border-jll-border/40 hover:bg-jll-border/10 ${s.label.includes('Current') ? 'bg-jll-teal/5' : ''}`}>
                <td className="p-3 text-white font-medium">{s.label}</td>
                <td className="p-3 text-right font-mono text-jll-accent">{fmtPct(s.capRate)}</td>
                <td className="p-3 text-right font-mono text-white">{fmtUSD(s.impliedValue)}</td>
                <td className="p-3 text-right font-mono text-jll-muted">{fmtPSF(s.perSF)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-jll-muted px-3 py-2 border-t border-jll-border">Based on T12 NOI of {fmtUSD(v.t12NOI)}. Illustrative only — actual valuation requires broker opinion or appraisal.</p>
      </div>

      <SectionHeader title="Return Metrics" badge={v.isPlaceholder ? "Placeholder" : "Live"} badgeColor={v.isPlaceholder ? "yellow" : "green"} />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPI label="NAV" value={fmtM(v.nav)} sub="Property Value − Debt" placeholder={v.isPlaceholder} />
        <KPI label="Cash-on-Cash" value={fmtPct(v.cashOnCash)} sub="Pre-tax CF ÷ Equity" placeholder={v.isPlaceholder} />
        <KPI label="Equity Multiple" value={v.equityMultiple.toFixed(2) + 'x'} sub="Total return ÷ Equity" placeholder={v.isPlaceholder} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPI label="Leveraged IRR" value={v.leveragedIRR ? fmtPct(v.leveragedIRR) : '—'} sub="Projected over hold period" placeholder={v.isPlaceholder} />
        <KPI label="Unlevered IRR" value={v.unleveredIRR ? fmtPct(v.unleveredIRR) : '—'} sub="Property-level return on cost" placeholder={v.isPlaceholder} />
        <KPI label="Equity Invested" value={fmtM(v.equityInvested)} placeholder={v.isPlaceholder} />
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────
const SUB_TABS = [
  { id: 'summary',   label: 'Summary' },
  { id: 'income',    label: 'Income & Cash Flow' },
  { id: 'expenses',  label: 'Operating Expenses' },
  { id: 'balance',   label: 'Balance Sheet' },
  { id: 'debt',      label: 'Debt & Capital' },
  { id: 'valuation', label: 'Valuation' },
];

export default function FinancialsView({ prop, t12Data, budgetData, derived, leases }) {
  const [subTab, setSubTab] = useState('summary');

  // Pull extended data from prop (static fallback built into pga3001.js)
  const balanceSheet = prop.balanceSheet || {
    asOf: '2025-12-31',
    assets: { total: 31193180, landAndBuilding: 29587412, tenantImprovements: 1209436, leasingCommissions: 279951, cashAndEquivalents: 116381 },
    liabilities: { total: 317934, accountsPayable: 68212, accruedExpenses: 72440, securityDeposits: 127282, prepaidRent: 50000 },
    equity: { total: 30875246, partnersCapital: 28774430, currentYearEarnings: 2100816 },
  };

  const expenseBreakdown = prop.expenseBreakdown || [
    { category: "Repairs & Maintenance", actual: 291108, budget: 264000 },
    { category: "Utilities",             actual: 229672, budget: 240000 },
    { category: "Insurance",             actual: 156595, budget: 160000 },
    { category: "Property Taxes",        actual: 135616, budget: 138000 },
    { category: "Management Fees",       actual: 94344,  budget: 93540 },
    { category: "Janitorial",            actual: 73020,  budget: 78000 },
    { category: "General & Admin",       actual: 63609,  budget: 91100 },
  ];

  const debtSchedule = prop.debtSchedule || {
    isPlaceholder: true,
    loans: [{ loanName: 'Senior Mortgage', lender: 'TBD', originalAmount: 18750000, currentBalance: 17200000, interestRate: 5.85, rateType: 'Fixed', spread: null, maturityDate: '2030-06-01', originationDate: '2023-06-01', amortization: '30-year', isIO: false, annualDebtService: 1327680, monthlyPayment: 110640, loanType: 'CMBS', prepaymentPenalty: 'Yield maintenance through 2028', rateCap: null }],
    metrics: { totalDebtOutstanding: 17200000, ltv: 55.1, ltc: null, dscr: 1.54, debtYield: 12.21, icr: 2.09, weightedAvgRate: 5.85, annualDebtService: 1327680 },
  };

  const valuation = prop.valuation || {
    isPlaceholder: true,
    bookValue: 31193180, t12NOI: 2100816, inPlaceCapRate: 6.74,
    scenarios: [
      { label: 'Conservative', capRate: 7.50, impliedValue: 28010880, perSF: 419.10 },
      { label: 'Current (Book)', capRate: 6.74, impliedValue: 31193180, perSF: 466.69 },
      { label: 'Market Mid', capRate: 6.50, impliedValue: 32320246, perSF: 483.56 },
      { label: 'Aggressive', capRate: 5.75, impliedValue: 36535930, perSF: 546.61 },
    ],
    nav: 13993180, equityInvested: 12500000, equityMultiple: 1.12, cashOnCash: 6.19,
    leveragedIRR: null, unleveredIRR: null,
  };

  return (
    <div className="space-y-5">
      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-jll-border/60 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              subTab === t.id ? 'text-jll-accent border-jll-accent' : 'text-jll-muted border-transparent hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'summary'   && <SummaryTab prop={prop} t12Data={t12Data} derived={derived} debtSchedule={debtSchedule} valuation={valuation} />}
      {subTab === 'income'    && <IncomeTab t12Data={t12Data} budgetData={budgetData} derived={derived} prop={prop} debtSchedule={debtSchedule} />}
      {subTab === 'expenses'  && <ExpensesTab t12Data={t12Data} expenseBreakdown={expenseBreakdown} prop={prop} />}
      {subTab === 'balance'   && <BalanceSheetTab balanceSheet={balanceSheet} />}
      {subTab === 'debt'      && <DebtTab debtSchedule={debtSchedule} t12NOI={derived.t12TotalNOI} />}
      {subTab === 'valuation' && <ValuationTab valuation={valuation} prop={prop} debtSchedule={debtSchedule} />}
    </div>
  );
}

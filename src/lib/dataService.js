/**
 * dataService.js — All Supabase reads/writes for 3001 PGA
 * Falls back to pga3001.js static data when Supabase is not connected.
 */
import { supabase, isConnected } from './supabase.js';
import { propertyData } from '../data/pga3001.js';

// ── READ: Portfolio / property summary ─────────────────────────
export async function getPortfolio() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_portfolio')
    .select('*')
    .single();
  if (error || !data) return null;
  return {
    name:              data.property_name,
    entity:            data.entity_name,
    address:           data.address,
    city:              data.city,
    state:             data.state,
    zip:               data.zip_code,
    totalSF:           Number(data.total_sf),
    occupiedSF:        Number(data.occupied_sf),
    leasedSF:          Number(data.leased_sf),
    vacantSF:          Number(data.vacant_sf),
    occupancyPct:      Number(data.physical_occupancy),
    leasedPct:         Number(data.leased_pct),
    currentBaseRent:   Number(data.monthly_base_rent),
    waRentPSF:         Number(data.wa_rent_psf),
    walt:              Number(data.walt),
  };
}

// ── READ: T12 income statement ─────────────────────────────────
export async function getT12Monthly() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_income_statement')
    .select('*')
    .order('period_date', { ascending: true });
  if (error || !data?.length) return null;
  return data.map(r => ({
    month:        r.period_label,
    periodDate:   r.period_date,
    revenue:      Number(r.total_revenue),
    expenses:     Number(r.total_recoverable_expenses) + Number(r.total_non_recoverable || 0),
    nonRec:       Number(r.total_non_recoverable || 0),
    noi:          Number(r.noi),
  }));
}

// ── READ: Rent roll ────────────────────────────────────────────
export async function getRentRoll() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_rent_roll')
    .select('*');
  if (error || !data?.length) return null;
  return data.map(r => ({
    unit:         r.unit,
    tenant:       r.tenant_name ?? '',
    sf:           Number(r.sf || 0),
    rentPSF:      Number(r.rent_psf || 0),
    monthlyRent:  Number(r.monthly_rent || 0),
    camMonthly:   Number(r.monthly_cam || 0),
    status:       r.status,
    leaseEnd:     r.lease_end,
    leaseStart:   r.lease_start,
    notes:        r.note ?? '',
  }));
}

// ── READ: Budget ───────────────────────────────────────────────
export async function getBudget() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_budget')
    .select('*')
    .order('period_date', { ascending: true });
  if (error || !data?.length) return null;
  return data.map(r => ({
    month:    r.period_label,
    income:   Number(r.total_revenue),
    expenses: Number(r.total_recoverable_expenses) + Number(r.total_non_recoverable || 0),
    noi:      Number(r.noi),
  }));
}

// ── READ: Lease events ─────────────────────────────────────────
export async function getLeaseEvents() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_lease_events')
    .select('*')
    .order('event_date', { ascending: true });
  if (error || !data?.length) return null;
  return data.map(r => ({
    date:        r.event_date,
    type:        r.event_type,
    tenant:      r.tenant_name,
    unit:        r.unit,
    sf:          Number(r.sf || 0),
    priority:    r.priority,
    description: r.description,
  }));
}

// ── READ: Expiry profile ───────────────────────────────────────
export async function getExpiryProfile() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_expiry_profile')
    .select('*')
    .order('expiry_year', { ascending: true });
  if (error || !data?.length) return null;
  return data.map(r => ({
    year:       r.expiry_year,
    sf:         Number(r.sf || 0),
    numLeases:  r.num_leases,
    annualRent: Number(r.annual_rent || 0),
    pctOfTotal: Number(r.pct_of_total || 0),
  }));
}

// ── READ: Balance sheet ────────────────────────────────────────
export async function getBalanceSheet() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('balance_sheet')
    .select('*')
    .order('category', { ascending: true });
  if (error || !data?.length) return null;
  return data;
}

// ── READ: Security deposits ────────────────────────────────────
export async function getSecurityDeposits() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('security_deposits')
    .select('*');
  if (error || !data?.length) return null;
  return data;
}

// ── READ: Debt schedule ───────────────────────────────────
export async function getDebtSchedule() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_debt_schedule')
    .select('*');
  if (error || !data?.length) return null;
  const loans = data.map(r => ({
    loanName:          r.loan_name,
    lender:            r.lender,
    originalAmount:    Number(r.original_amount || 0),
    currentBalance:    Number(r.current_balance || 0),
    interestRate:      Number(r.interest_rate || 0),
    rateType:          r.rate_type || 'Fixed',
    spread:            r.spread ? Number(r.spread) : null,
    maturityDate:      r.maturity_date,
    originationDate:   r.origination_date,
    amortization:      r.amortization || '30-year',
    isIO:              r.is_io || false,
    annualDebtService: Number(r.annual_debt_service || 0),
    monthlyPayment:    Number(r.monthly_payment || 0),
    loanType:          r.loan_type || 'Conventional',
    prepaymentPenalty: r.prepayment_penalty,
    rateCap:           r.rate_cap,
  }));
  const totalDebt = loans.reduce((s, l) => s + l.currentBalance, 0);
  const totalDS   = loans.reduce((s, l) => s + l.annualDebtService, 0);
  const t12NOI    = 2100816; // fallback — will be overridden by live data
  return {
    isPlaceholder: false,
    loans,
    metrics: {
      totalDebtOutstanding: totalDebt,
      annualDebtService: totalDS,
      ltv: null,  // computed by component
      ltc: null,
      dscr: totalDS > 0 ? t12NOI / totalDS : null,
      debtYield: totalDebt > 0 ? (t12NOI / totalDebt) * 100 : null,
      icr: null,
      weightedAvgRate: loans.length ? loans.reduce((s, l) => s + l.interestRate * l.currentBalance, 0) / totalDebt : 0,
    },
  };
}

// ── READ: Expense breakdown ──────────────────────────────
export async function getExpenseBreakdown() {
  if (!isConnected()) return null;
  const { data, error } = await supabase
    .from('active_expense_breakdown')
    .select('*')
    .order('actual_amount', { ascending: false });
  if (error || !data?.length) return null;
  return data.map(r => ({
    category: r.category,
    actual:   Number(r.actual_amount || 0),
    budget:   Number(r.budget_amount || 0),
  }));
}

// ── READ: Upload history ───────────────────────────────────────
export async function getUploadHistory() {
  if (!isConnected()) return [];
  const { data, error } = await supabase
    .from('upload_snapshots')
    .select('*')
    .order('upload_date', { ascending: false })
    .limit(20);
  if (error) return [];
  return data;
}

// ── WRITE: Insert new management report snapshot ───────────────
export async function insertManagementReport({ filename, t12Rows, portfolio }) {
  if (!isConnected()) return { error: 'Not connected' };

  const { data: snap, error: snapErr } = await supabase
    .from('upload_snapshots')
    .insert({ upload_type: 'management_report', file_name: filename, is_active: true })
    .select()
    .single();
  if (snapErr) return { error: snapErr.message };

  const sid = snap.id;
  if (portfolio) {
    await supabase.from('portfolio_snapshot').insert({ snapshot_id: sid, ...portfolio });
  }
  if (t12Rows?.length) {
    for (let i = 0; i < t12Rows.length; i += 6) {
      await supabase.from('income_statement').insert(
        t12Rows.slice(i, i + 6).map(r => ({ snapshot_id: sid, ...r }))
      );
    }
  }
  return { snapshotId: sid };
}

// ── WRITE: Insert new budget snapshot ─────────────────────
export async function insertBudget({ filename, rows }) {
  if (!isConnected()) return { error: 'Not connected' };

  const { data: snap, error: snapErr } = await supabase
    .from('upload_snapshots')
    .insert({ upload_type: 'budget', file_name: filename, is_active: true })
    .select()
    .single();
  if (snapErr) return { error: snapErr.message };

  const sid = snap.id;
  if (rows?.length) {
    for (let i = 0; i < rows.length; i += 6) {
      await supabase.from('budget').insert(
        rows.slice(i, i + 6).map(r => ({ snapshot_id: sid, ...r }))
      );
    }
  }
  return { snapshotId: sid };
}

// ── WRITE: Insert debt schedule snapshot ──────────────────────
export async function insertDebtSchedule({ filename, loans }) {
  if (!isConnected()) return { error: 'Not connected' };
  const { data: snap, error: snapErr } = await supabase
    .from('upload_snapshots')
    .insert({ upload_type: 'debt_schedule', file_name: filename, is_active: true })
    .select()
    .single();
  if (snapErr) return { error: snapErr.message };
  const sid = snap.id;
  if (loans?.length) {
    await supabase.from('debt_schedule').insert(
      loans.map(l => ({ snapshot_id: sid, ...l }))
    );
  }
  return { snapshotId: sid };
}

// ── WRITE: Insert new rent roll snapshot ───────────────────────
export async function insertRentRoll({ filename, rows }) {
  if (!isConnected()) return { error: 'Not connected' };

  const { data: snap, error: snapErr } = await supabase
    .from('upload_snapshots')
    .insert({ upload_type: 'rent_roll', file_name: filename, is_active: true })
    .select()
    .single();
  if (snapErr) return { error: snapErr.message };

  const sid = snap.id;
  if (rows?.length) {
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from('rent_roll').insert(
        rows.slice(i, i + 50).map(r => ({ snapshot_id: sid, ...r }))
      );
    }
  }
  return { snapshotId: sid };
}

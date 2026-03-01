import { propertyData } from '../data/pga3001.js';

/**
 * Build structured context from current property data for the AI assistant.
 * Scopes detail level based on activeTab to keep context concise.
 */
export function buildAssetContext(activeTab, { prop, leases, t12Data, budgetData, expiryArr, events } = {}) {
  const p = prop || propertyData;
  const l = leases || propertyData.leases;
  const t12 = t12Data || propertyData.t12Statement;
  const bud = budgetData || propertyData.budget2026;
  const exp = expiryArr || propertyData.expiryProfile;

  const summary = [
    `Property: ${p.name}`,
    `Entity: ${p.entity || 'APC US East Palm Beach V, LLC'}`,
    `Address: ${p.address}, ${p.city}, ${p.state} ${p.zip}`,
    `Total SF: ${Number(p.totalSF).toLocaleString()}`,
    `Physical Occupancy: ${Number(p.occupancyPct).toFixed(1)}%`,
    `Leased: ${Number(p.leasedPct).toFixed(1)}%`,
    `Monthly Base Rent: $${Number(p.currentBaseRent).toLocaleString()}`,
    `WA Rent PSF: $${p.waRentPSF}`,
    `WALT: ${p.walt} years`,
  ].join('\n');

  let leasingContext = '';
  if (['overview', 'leasing', 'data'].includes(activeTab)) {
    const active = l.filter(t => t.status === 'Current' || t.status === 'MTM');
    const vacant = l.filter(t => t.status === 'Vacant');
    leasingContext = '\n\n--- RENT ROLL ---\n';
    leasingContext += `Active Leases: ${active.length}\nVacant Units: ${vacant.length}\n\n`;
    active.forEach(t => {
      leasingContext += `• ${t.tenant} | Suite ${t.unit} | ${Number(t.sf).toLocaleString()} SF | $${Number(t.monthlyRent).toLocaleString()}/mo | $${Number(t.rentPSF).toFixed(2)} PSF | Expires: ${t.leaseEnd || 'MTM'}\n`;
    });
    if (vacant.length) {
      leasingContext += '\nVacant:\n';
      vacant.forEach(v => {
        leasingContext += `• Suite ${v.unit} | ${Number(v.sf).toLocaleString()} SF | ${v.notes || ''}\n`;
      });
    }
  }

  let expiryContext = '';
  if (['overview', 'leasing', 'events'].includes(activeTab)) {
    expiryContext = '\n\n--- LEASE EXPIRY PROFILE ---\n';
    exp.forEach(e => {
      expiryContext += `${e.year}: ${Number(e.sf).toLocaleString()} SF | ${e.numLeases || '?'} leases | $${Number(e.annualRent || 0).toLocaleString()} annual rent\n`;
    });
  }

  let financialContext = '';
  if (['overview', 'financials', 'data'].includes(activeTab)) {
    const t12NOI = t12.reduce((s, m) => s + (m.noi || 0), 0);
    const budNOI = bud.reduce((s, m) => s + (m.noi || 0), 0);
    financialContext = '\n\n--- T12 FINANCIALS ---\n';
    financialContext += `T12 Total NOI: $${t12NOI.toLocaleString()}\n2026 Budget NOI: $${budNOI.toLocaleString()}\n\n`;
    financialContext += 'Monthly T12:\n';
    t12.forEach(m => {
      financialContext += `${m.month}: Rev $${Number(m.revenue).toLocaleString()} | Exp $${Number(m.expenses).toLocaleString()} | NOI $${Number(m.noi).toLocaleString()}\n`;
    });
    financialContext += '\n2026 Budget:\n';
    bud.forEach(m => {
      financialContext += `${m.month}: Income $${Number(m.income).toLocaleString()} | Exp $${Number(m.expenses).toLocaleString()} | NOI $${Number(m.noi).toLocaleString()}\n`;
    });
  }

  let eventsContext = '';
  if (['events', 'overview'].includes(activeTab)) {
    const evts = events || [
      { date: '2026-04-01', type: 'Lease Start', tenant: 'Nason Yeager (Suite 201 Expansion)', priority: 'high', description: '5,374 SF expansion at $38 PSF. $1.07M TI allowance.' },
      { date: '2026-05-01', type: 'Rent Adjustment', tenant: 'Seacoast National Bank', priority: 'critical', description: 'Rent drops to $25 PSF for May-Oct 2026.' },
      { date: '2026-11-01', type: 'Rent Adjustment', tenant: 'Seacoast National Bank', priority: 'high', description: 'Rent reverts to $50 PSF.' },
      { date: '2026-12-31', type: 'Lease Expiry', tenant: 'Absolute Equity Managers', priority: 'critical', description: '1,728 SF expiring. No renewal budgeted.' },
    ];
    eventsContext = '\n\n--- KEY EVENTS ---\n';
    evts.forEach(e => {
      eventsContext += `[${e.priority?.toUpperCase()}] ${e.date} — ${e.type}: ${e.tenant} — ${e.description}\n`;
    });
  }

  const alerts = `\n\n--- CRITICAL ALERTS ---
1. Seacoast National Bank: Rent step-down May-Oct 2026 ($51.03→$25 PSF). ~$81K revenue impact.
2. Absolute Equity Managers: Lease expires 12/31/2026. 1,728 SF. No renewal budgeted.
3. Nason Yeager Expansion: Suite 201, 5,374 SF starting Apr 2026. Will bring building to 100% physical occupancy.`;

  return {
    text: summary + leasingContext + expiryContext + financialContext + eventsContext + alerts,
    propertyName: p.name,
    activeTab,
  };
}

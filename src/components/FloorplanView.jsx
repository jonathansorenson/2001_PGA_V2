import { useState, useMemo } from 'react';

// ── Suite layout per floor (proportional grid coordinates) ──
// Each suite: { id, label, tenant, sf, x, y, w, h } — coords are % based
const FLOOR_LAYOUTS = {
  1: [
    { id: '100',  x: 0,  y: 0,  w: 40, h: 50 },
    { id: '101',  x: 40, y: 0,  w: 15, h: 25 },
    { id: '101B', x: 40, y: 25, w: 15, h: 25 },
    { id: '102',  x: 55, y: 0,  w: 45, h: 50 },
    { id: '103',  x: 0,  y: 50, w: 25, h: 50 },
    { id: '104',  x: 25, y: 50, w: 35, h: 50 },
    { id: '110',  x: 60, y: 50, w: 40, h: 50 },
  ],
  2: [
    { id: '200',  x: 0,  y: 0,  w: 50, h: 55 },
    { id: '201',  x: 50, y: 0,  w: 50, h: 45 },
    { id: '202',  x: 0,  y: 55, w: 45, h: 45 },
    { id: '203',  x: 45, y: 45, w: 55, h: 55 },
  ],
  3: [
    { id: '300',  x: 0,  y: 0,  w: 40, h: 100 },
    { id: '301',  x: 40, y: 0,  w: 35, h: 100 },
    { id: '305',  x: 75, y: 0,  w: 25, h: 100 },
  ],
};

// Multi-unit tenants (share one rent_roll row)
const MULTI_UNIT_MAP = {
  '102': '102, 301, 305',
  '301': '102, 301, 305',
  '305': '102, 301, 305',
  '200': '200, 203',
  '203': '200, 203',
};

function getLeaseStatus(lease) {
  if (!lease || lease.status === 'Vacant') return 'vacant';
  if (!lease.leaseEnd) return 'mtm';
  const end = new Date(lease.leaseEnd);
  const now = new Date();
  const monthsLeft = (end - now) / (1000 * 60 * 60 * 24 * 30);
  if (monthsLeft <= 12) return 'critical';
  if (monthsLeft <= 24) return 'expiring';
  return 'stable';
}

const STATUS_COLORS = {
  stable:   { bg: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.6)',  text: '#10B981', label: 'Stable' },
  expiring: { bg: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.6)',  text: '#F59E0B', label: 'Expiring' },
  critical: { bg: 'rgba(196,18,48,0.25)',   border: 'rgba(196,18,48,0.6)',   text: '#C41230', label: 'Critical' },
  vacant:   { bg: 'rgba(196,18,48,0.15)',   border: 'rgba(196,18,48,0.4)',   text: '#EF4444', label: 'Vacant' },
  mtm:      { bg: 'rgba(139,92,246,0.25)',  border: 'rgba(139,92,246,0.6)',  text: '#8B5CF6', label: 'MTM' },
  future:   { bg: 'rgba(59,130,246,0.25)',  border: 'rgba(59,130,246,0.6)',  text: '#3B82F6', label: 'Pre-Leased' },
};

function SuiteBlock({ suite, lease, isSelected, onClick }) {
  const status = getLeaseStatus(lease);
  const colors = STATUS_COLORS[status];
  const tenantName = lease?.tenant || lease?.tenantName || lease?.tenant_name || 'Unknown';
  const sf = lease?.sf || 0;

  return (
    <div
      onClick={() => onClick(suite.id)}
      style={{
        position: 'absolute',
        left: `${suite.x}%`,
        top: `${suite.y}%`,
        width: `${suite.w}%`,
        height: `${suite.h}%`,
        backgroundColor: colors.bg,
        border: `2px solid ${isSelected ? '#fff' : colors.border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        boxSizing: 'border-box',
        zIndex: isSelected ? 10 : 1,
        boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 20px rgba(74,143,212,0.4)' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
    >
      <span style={{ color: '#fff', fontWeight: 700, fontSize: suite.w > 20 ? '14px' : '11px', fontFamily: 'monospace' }}>
        {suite.id}
      </span>
      {suite.w > 18 && suite.h > 30 && (
        <span style={{ color: colors.text, fontSize: '10px', fontWeight: 600, marginTop: '2px', textAlign: 'center', lineHeight: 1.2, maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tenantName.length > 18 ? tenantName.substring(0, 16) + '…' : tenantName}
        </span>
      )}
      {suite.w > 20 && suite.h > 40 && (
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', marginTop: '1px' }}>
          {Number(sf).toLocaleString()} SF
        </span>
      )}
    </div>
  );
}

function DetailPanel({ suiteId, lease, onClose }) {
  if (!suiteId) return null;
  const status = getLeaseStatus(lease);
  const colors = STATUS_COLORS[status];
  const tenantName = lease?.tenant || lease?.tenantName || lease?.tenant_name || 'Vacant';
  const sf = Number(lease?.sf || 0);
  const monthlyRent = Number(lease?.monthlyRent || lease?.monthly_rent || 0);
  const rentPSF = Number(lease?.rentPSF || lease?.rent_psf || 0);
  const leaseStart = lease?.leaseStart || lease?.lease_start;
  const leaseEnd = lease?.leaseEnd || lease?.lease_end;

  return (
    <div className="rounded-xl border border-jll-border bg-jll-card p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-mono font-bold text-lg">Suite {suiteId}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
              {colors.label}
            </span>
          </div>
          <p className="text-sm text-white font-semibold">{tenantName}</p>
        </div>
        <button onClick={onClose} className="text-jll-muted hover:text-white transition-colors text-lg leading-none">&times;</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase">Square Feet</p>
          <p className="text-white font-mono font-bold">{sf > 0 ? sf.toLocaleString() : '—'}</p>
        </div>
        <div className="rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase">Monthly Rent</p>
          <p className="text-white font-mono font-bold">{monthlyRent > 0 ? `$${monthlyRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</p>
        </div>
        <div className="rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase">Rent PSF</p>
          <p className="text-jll-accent font-mono font-bold">{rentPSF > 0 ? `$${rentPSF.toFixed(2)}` : '—'}</p>
        </div>
        <div className="rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase">Status</p>
          <p className="font-mono font-bold" style={{ color: colors.text }}>{lease?.status || 'Vacant'}</p>
        </div>
        <div className="rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase">Lease Start</p>
          <p className="text-white font-mono text-sm">{leaseStart || '—'}</p>
        </div>
        <div className="rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase">Lease End</p>
          <p className="text-white font-mono text-sm">{leaseEnd || '—'}</p>
        </div>
      </div>

      {lease?.note && (
        <div className="mt-3 rounded-lg bg-jll-navy/50 p-3">
          <p className="text-xs text-jll-muted uppercase mb-1">Notes</p>
          <p className="text-white text-xs">{lease.note}</p>
        </div>
      )}
    </div>
  );
}

export default function FloorplanView({ leases }) {
  const [floor, setFloor] = useState(1);
  const [selectedSuite, setSelectedSuite] = useState(null);

  // Build lookup: suiteId → lease data
  const leaseLookup = useMemo(() => {
    const map = {};
    (leases || []).forEach(l => {
      const unit = l.unit;
      // Handle multi-unit entries like "102, 301, 305"
      if (unit && unit.includes(',')) {
        unit.split(',').map(u => u.trim()).forEach(u => { map[u] = l; });
      } else if (unit) {
        map[unit] = l;
      }
    });
    return map;
  }, [leases]);

  const currentLayout = FLOOR_LAYOUTS[floor] || [];

  const selectedLease = selectedSuite
    ? leaseLookup[MULTI_UNIT_MAP[selectedSuite] || selectedSuite] || leaseLookup[selectedSuite]
    : null;

  // Floor stats
  const floorStats = useMemo(() => {
    let totalSF = 0, occupiedSF = 0, vacantSF = 0;
    currentLayout.forEach(s => {
      const key = MULTI_UNIT_MAP[s.id] || s.id;
      const lease = leaseLookup[key] || leaseLookup[s.id];
      const sf = Number(lease?.sf || 0);
      // For multi-unit, approximate SF per suite
      const unitCount = key.includes(',') ? key.split(',').length : 1;
      const suiteSF = sf / unitCount;
      totalSF += suiteSF;
      if (lease?.status === 'Vacant') vacantSF += suiteSF;
      else occupiedSF += suiteSF;
    });
    return { totalSF: Math.round(totalSF), occupiedSF: Math.round(occupiedSF), vacantSF: Math.round(vacantSF) };
  }, [currentLayout, leaseLookup]);

  return (
    <div className="space-y-5">
      {/* Floor selector + legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1">
          {[1, 2, 3].map(f => (
            <button key={f} onClick={() => { setFloor(f); setSelectedSuite(null); }}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                floor === f ? 'text-jll-accent border-jll-accent' : 'text-jll-muted border-transparent hover:text-white'}`}>
              Floor {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: val.bg, border: `1px solid ${val.border}` }} />
              <span className="text-xs text-jll-muted">{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floor summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-jll-border bg-jll-card p-3 text-center">
          <p className="text-xs text-jll-muted uppercase">Floor {floor} Total SF</p>
          <p className="text-white font-mono font-bold text-lg">{floorStats.totalSF.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-jll-border bg-jll-card p-3 text-center">
          <p className="text-xs text-jll-muted uppercase">Occupied</p>
          <p className="text-green-400 font-mono font-bold text-lg">{floorStats.occupiedSF.toLocaleString()} SF</p>
        </div>
        <div className="rounded-xl border border-jll-border bg-jll-card p-3 text-center">
          <p className="text-xs text-jll-muted uppercase">Vacant</p>
          <p className="text-jll-red font-mono font-bold text-lg">{floorStats.vacantSF.toLocaleString()} SF</p>
        </div>
      </div>

      {/* Floorplan + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Schematic */}
        <div className="lg:col-span-2 rounded-xl border border-jll-border bg-jll-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Floor {floor} — 3001 PGA Blvd
            </h3>
            <span className="text-xs text-jll-muted">Click a suite for details</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '55%', backgroundColor: 'rgba(15,34,54,0.5)', borderRadius: '8px', overflow: 'hidden' }}>
            {currentLayout.map(suite => {
              const key = MULTI_UNIT_MAP[suite.id] || suite.id;
              const lease = leaseLookup[key] || leaseLookup[suite.id];
              return (
                <SuiteBlock
                  key={suite.id}
                  suite={suite}
                  lease={lease}
                  isSelected={selectedSuite === suite.id}
                  onClick={setSelectedSuite}
                />
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {selectedSuite ? (
            <DetailPanel
              suiteId={selectedSuite}
              lease={selectedLease}
              onClose={() => setSelectedSuite(null)}
            />
          ) : (
            <div className="rounded-xl border border-jll-border/40 bg-jll-card/50 p-8 text-center">
              <p className="text-jll-muted text-sm">Select a suite to view lease details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

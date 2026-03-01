import React from 'react';
import { Calendar, AlertCircle, TrendingUp, Zap } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (num) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const getPriorityBadgeStyle = (priority) => {
  switch (priority) {
    case 'critical':
      return 'bg-red bg-opacity-10 text-red border-red';
    case 'high':
      return 'bg-warn bg-opacity-10 text-warn border-warn';
    case 'medium':
      return 'bg-accent bg-opacity-10 text-accent border-accent';
    case 'low':
      return 'bg-success bg-opacity-10 text-success border-success';
    default:
      return 'bg-muted bg-opacity-10 text-muted border-muted';
  }
};

const getEventIcon = (type) => {
  switch (type) {
    case 'expiration':
      return <AlertCircle className="w-5 h-5" />;
    case 'expansion':
      return <TrendingUp className="w-5 h-5" />;
    case 'free_rent_end':
      return <Zap className="w-5 h-5" />;
    case 'escalation':
      return <TrendingUp className="w-5 h-5" />;
    default:
      return <Calendar className="w-5 h-5" />;
  }
};

export default function Events({ data }) {
  // Generate events from lease data
  const events = [];

  data.leases.forEach(lease => {
    // Expiration events
    if (lease.leaseEnd) {
      const expirationDate = new Date(lease.leaseEnd);
      const today = new Date('2026-02-28');
      const daysUntilExpiry = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));

      let priority = 'low';
      if (daysUntilExpiry < 0) priority = 'critical';
      else if (daysUntilExpiry < 180) priority = 'high';
      else if (daysUntilExpiry < 365) priority = 'medium';

      events.push({
        date: lease.leaseEnd,
        type: 'expiration',
        priority,
        tenant: lease.tenant,
        unit: lease.unit,
        title: `${lease.tenant} - Lease Expiration`,
        description: `Unit ${lease.unit} lease expires. ${lease.sf} SF at ${lease.rentPSF ? '$' + lease.rentPSF.toFixed(2) : 'N/A'} PSF.`,
        sf: lease.sf,
        rent: lease.monthlyRent,
      });
    }

    // Escalation events (annual for 3% escalations)
    if (lease.notes && lease.notes.includes('escalation')) {
      const startDate = new Date(lease.leaseStart);
      for (let i = 1; i <= 5; i++) {
        const escalationDate = new Date(startDate.getFullYear() + i, startDate.getMonth(), startDate.getDate());
        if (escalationDate > new Date('2026-02-28') && escalationDate < new Date('2028-12-31')) {
          events.push({
            date: escalationDate.toISOString().split('T')[0],
            type: 'escalation',
            priority: 'low',
            tenant: lease.tenant,
            unit: lease.unit,
            title: `${lease.tenant} - Rent Escalation`,
            description: `Annual 3% rent escalation for Unit ${lease.unit}.`,
            sf: lease.sf,
            rent: lease.monthlyRent,
          });
        }
      }
    }

    // Free rent end event for Nason Yeager expansion
    if (lease.tenant === 'Nason, Yeager, Gerson, White & Lioce, P.A.' && lease.notes && lease.notes.includes('3 months free')) {
      events.push({
        date: '2026-07-01',
        type: 'free_rent_end',
        priority: 'high',
        tenant: lease.tenant,
        unit: 'Suite 201',
        title: 'Nason Yeager - Free Rent Period Ends',
        description: 'Suite 201 expansion free rent period ends. Full rent at $38 PSF begins.',
        sf: 5374,
        rent: 5374 * 38 / 12,
      });
    }

    // Rent reduction event for Seacoast
    if (lease.tenant === 'Seacoast National Bank' && lease.notes && lease.notes.includes('drops to')) {
      events.push({
        date: '2026-05-01',
        type: 'escalation',
        priority: 'critical',
        tenant: lease.tenant,
        unit: lease.unit,
        title: 'Seacoast National Bank - Rent Rate Change',
        description: 'Rent rate drops from $51.03 to $25 PSF for May-Oct 2026 period.',
        sf: lease.sf,
        rent: lease.monthlyRent * (25 / 51.03),
      });

      events.push({
        date: '2026-11-01',
        type: 'escalation',
        priority: 'high',
        tenant: lease.tenant,
        unit: lease.unit,
        title: 'Seacoast National Bank - Rent Rate Reset',
        description: 'Rent rate reverts from $25 to $50 PSF after promotional period.',
        sf: lease.sf,
        rent: lease.monthlyRent * (50 / 51.03),
      });
    }
  });

  // Remove duplicates and sort by date
  const uniqueEvents = Array.from(
    new Map(events.map(e => [e.date + e.title, e])).values()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  const upcomingEvents = uniqueEvents.filter(e => new Date(e.date) >= new Date('2026-02-28'));
  const pastEvents = uniqueEvents.filter(e => new Date(e.date) < new Date('2026-02-28')).reverse();

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Events
        </h3>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg ${getPriorityBadgeStyle(
                        event.priority
                      )}`}
                    >
                      {getEventIcon(event.type)}
                    </div>
                  </div>

                  <div className="flex-grow">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-white font-semibold">{event.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityBadgeStyle(event.priority)}`}>
                        {event.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-secondary text-sm mb-2">{event.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(event.date)}
                      </span>
                      {event.sf > 0 && (
                        <span>
                          {event.sf.toLocaleString()} SF
                        </span>
                      )}
                      <span className="text-accent font-medium">
                        {event.rent ? formatCurrency(event.rent) + '/mo' : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-secondary">No upcoming events</p>
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 opacity-50" />
            Recent Events (Past 12 Months)
          </h3>

          <div className="space-y-3">
            {pastEvents.slice(0, 6).map((event, idx) => (
              <div
                key={idx}
                className="bg-card border border-border border-opacity-50 rounded-lg p-4 opacity-75"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg ${getPriorityBadgeStyle(
                        event.priority
                      )} opacity-50`}
                    >
                      {getEventIcon(event.type)}
                    </div>
                  </div>

                  <div className="flex-grow">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-white font-semibold">{event.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border opacity-50 ${getPriorityBadgeStyle(event.priority)}`}>
                        {event.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-secondary text-sm mb-2 opacity-75">{event.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted opacity-75">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(event.date)}
                      </span>
                      {event.sf > 0 && (
                        <span>
                          {event.sf.toLocaleString()} SF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-secondary text-sm font-medium mb-1">Total Upcoming Events</p>
          <p className="text-2xl font-bold text-white">{upcomingEvents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-secondary text-sm font-medium mb-1">Critical Events</p>
          <p className="text-2xl font-bold text-red">{upcomingEvents.filter(e => e.priority === 'critical').length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-secondary text-sm font-medium mb-1">High Priority Events</p>
          <p className="text-2xl font-bold text-warn">{upcomingEvents.filter(e => e.priority === 'high').length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-secondary text-sm font-medium mb-1">Near-Term (30 Days)</p>
          <p className="text-2xl font-bold text-accent">
            {upcomingEvents.filter(e => {
              const days = (new Date(e.date) - new Date('2026-02-28')) / (1000 * 60 * 60 * 24);
              return days <= 30;
            }).length}
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { propertyData } from './data/pga3001';
import Overview from './components/Overview';
import Leasing from './components/Leasing';
import Financials from './components/Financials';
import Events from './components/Events';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', component: Overview },
    { id: 'leasing', label: 'Leasing', component: Leasing },
    { id: 'financials', label: 'Financials', component: Financials },
    { id: 'events', label: 'Events', component: Events },
  ];

  const activeTabComponent = tabs.find(tab => tab.id === activeTab);
  const TabComponent = activeTabComponent?.component;

  return (
    <div className="min-h-screen bg-navy text-primary">
      {/* Header */}
      <div className="bg-navy border-b border-border px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-accent">CRElytic</span>
              <span className="px-2 py-1 bg-accent bg-opacity-20 text-accent text-xs font-semibold rounded">
                SPOTLIGHT
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{propertyData.name}</h1>
            <p className="text-secondary">
              {propertyData.address} • {propertyData.city}, {propertyData.state} {propertyData.zip}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-navy border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-accent'
                    : 'text-secondary border-transparent hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-navy min-h-[calc(100vh-200px)]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {TabComponent && <TabComponent data={propertyData} />}
        </div>
      </div>
    </div>
  );
}

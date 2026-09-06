import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

export default function ProjectTable({ projects, onSelectProject, sectors, states }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');

  const filtered = projects.filter(p => {
    const matchSearch = searchTerm === '' ||
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSector = selectedSector === 'All' || p.sector === selectedSector;
    const matchState = selectedState === 'All' || p.state === selectedState;
    const matchRisk = selectedRisk === 'All' || p.risk_band === selectedRisk;
    return matchSearch && matchSector && matchState && matchRisk;
  });

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      
      {/* Search & Filter Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.4rem 0.8rem', width: '320px' }}>
          <Search size={18} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search project name or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#f8fafc', outline: 'none', width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedSector}
            onChange={e => setSelectedSector(e.target.value)}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <option value="All">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <option value="All">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <option value="All">All Risk Bands</option>
            <option value="Red">Red (High Risk)</option>
            <option value="Amber">Amber (Moderate Risk)</option>
            <option value="Green">Green (Low Risk)</option>
          </select>
        </div>

      </div>

      {/* Projects Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '0.75rem' }}>Project ID</th>
              <th style={{ padding: '0.75rem' }}>Project Name</th>
              <th style={{ padding: '0.75rem' }}>Sector</th>
              <th style={{ padding: '0.75rem' }}>State</th>
              <th style={{ padding: '0.75rem' }}>Agency</th>
              <th style={{ padding: '0.75rem' }}>Sanctioned Cost</th>
              <th style={{ padding: '0.75rem' }}>Risk Score</th>
              <th style={{ padding: '0.75rem' }}>Risk Band</th>
              <th style={{ padding: '0.75rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(p => {
              const badgeClass = p.risk_band === 'Red' ? 'badge-red' : p.risk_band === 'Amber' ? 'badge-amber' : 'badge-green';
              return (
                <tr
                  key={p.project_id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                  onClick={() => onSelectProject(p.project_id)}
                >
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>{p.project_id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 500, color: '#f1f5f9' }}>{p.project_name}</td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{p.sector}</td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{p.state}</td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{p.implementing_agency}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{p.original_cost_cr} Cr</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>{p.composite_risk_score}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={badgeClass} style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {p.risk_band}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectProject(p.project_id); }}
                      style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

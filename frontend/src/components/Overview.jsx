import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, ShieldCheck, Clock, DollarSign, Activity } from 'lucide-react';

export default function Overview({ summary, projects, onSelectProject }) {
  if (!summary) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard summary...</div>;

  const { total_projects, total_original_cost_cr, total_revised_cost_cr, total_cost_at_risk_cr, risk_band_counts, sector_distribution, monthly_trend } = summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>TOTAL PROJECTS TRACKED</span>
            <Activity size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: '#f8fafc' }}>
            {total_projects.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Across 22 MoSPI Sectors
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>GREEN (LOW RISK)</span>
            <ShieldCheck size={18} color="#22c55e" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: '#4ade80' }}>
            {risk_band_counts.Green}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            On schedule & within budget
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>AMBER (MODERATE RISK)</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: '#fbbf24' }}>
            {risk_band_counts.Amber}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Minor slippage monitored
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>RED (HIGH RISK / ALERT)</span>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: '#f87171' }}>
            {risk_band_counts.Red}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Immediate intervention needed
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>TOTAL COST AT RISK</span>
            <DollarSign size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.5rem', color: '#c084fc' }}>
            ₹{(total_cost_at_risk_cr / 1000).toFixed(1)}k Cr
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Total revised cost of Red projects
          </div>
        </div>

      </div>

      {/* Middle Row: GIS Map & Sector Bar Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>

        {/* GIS Map */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f1f5f9', fontWeight: 600 }}>
            India GIS Infrastructure Project Risk Map
          </h3>
          <MapContainer center={[21.5, 78.9]} zoom={4.5} style={{ height: '360px', width: '100%', borderRadius: '8px' }}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {projects.slice(0, 300).map(p => {
              if (!p.latitude || !p.longitude) return null;
              const color = p.risk_band === 'Red' ? '#ef4444' : p.risk_band === 'Amber' ? '#f59e0b' : '#22c55e';
              return (
                <CircleMarker
                  key={p.project_id}
                  center={[p.latitude, p.longitude]}
                  radius={p.risk_band === 'Red' ? 7 : 5}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.75 }}
                  eventHandlers={{ click: () => onSelectProject(p.project_id) }}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                      <strong>{p.project_id}: {p.project_name}</strong><br/>
                      Sector: {p.sector}<br/>
                      State: {p.state}<br/>
                      Risk Score: {p.composite_risk_score} ({p.risk_band})<br/>
                      Cost: ₹{p.original_cost_cr} Cr
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sector Distribution Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f1f5f9', fontWeight: 600 }}>
            High-Risk Projects by Sector (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={sector_distribution} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="sector" type="category" stroke="#94a3b8" width={110} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc' }} />
              <Bar dataKey="red_count" name="Red (High Risk)" fill="#ef4444" stackId="a" />
              <Bar dataKey="amber_count" name="Amber (Moderate)" fill="#f59e0b" stackId="a" />
              <Bar dataKey="green_count" name="Green (Low Risk)" fill="#22c55e" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ArrowLeft, AlertOctagon, TrendingUp, Award, Layers } from 'lucide-react';

export default function ProjectDetailView({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const pRes = await fetch(`http://localhost:8000/projects/${projectId}`);
        const pData = await pRes.json();
        setProject(pData);

        const bRes = await fetch(`http://localhost:8000/projects/${projectId}/benchmark`);
        const bData = await bRes.json();
        setBenchmark(bData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  if (loading || !project) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading project details...</div>;

  const badgeClass = project.risk_band === 'Red' ? 'badge-red' : project.risk_band === 'Amber' ? 'badge-amber' : 'badge-green';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <span className={badgeClass} style={{ padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 700 }}>
          {project.risk_band} RISK BAND (Score: {project.composite_risk_score}/100)
        </span>
      </div>

      {/* Info Header Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{project.project_name}</div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>ID: {project.project_id} | State: {project.state}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>MINISTRY & SECTOR</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>{project.sector}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>IMPLEMENTING AGENCY</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>{project.implementing_agency}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ORIGINAL COST</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8' }}>₹{project.original_cost_cr} Cr</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>REVISED COST</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: project.revised_cost_cr > project.original_cost_cr ? '#f87171' : '#4ade80' }}>
              ₹{project.revised_cost_cr} Cr
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>MILESTONES COMPLETED</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>
              {project.milestones_completed} / {project.num_milestones} ({project.milestones_delayed} delayed)
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: SHAP Factors & Benchmark Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>

        {/* SHAP Factors Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={18} color="#f59e0b" /> SHAP Risk Factor Attribution (Explainability)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {project.top_factors && project.top_factors.map((f, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#e2e8f0' }}>{f.description}</span>
                  <span style={{ fontWeight: 700, color: '#fbbf24' }}>{f.contribution_pct}%</span>
                </div>
                <div style={{ width: '100%', background: '#0f172a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${f.contribution_pct}%`, background: f.contribution_pct > 30 ? '#ef4444' : '#f59e0b', height: '100%', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Benchmark Comparison */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#38bdf8" /> Sector Benchmark Peer Ranking
          </h3>
          {benchmark && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#38bdf8', fontWeight: 600 }}>
                {benchmark.performance_verdict}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Project Cost Overrun:</span>
                <span style={{ fontWeight: 600 }}>{benchmark.project_cost_overrun_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Sector Avg Cost Overrun:</span>
                <span style={{ fontWeight: 600 }}>{benchmark.sector_avg_cost_overrun_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Cost Risk Percentile:</span>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{benchmark.cost_overrun_percentile}th Percentile</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Project Schedule Delay:</span>
                <span style={{ fontWeight: 600 }}>{benchmark.project_delay_months} Months</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Chart: Monthly Progress Trajectory */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="#4ade80" /> Expenditure & Physical Progress Trajectory
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={project.monthly_progress}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis yAxisId="left" stroke="#38bdf8" />
            <YAxis yAxisId="right" orientation="right" stroke="#4ade80" domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc' }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="cumulative_expenditure_cr" name="Cumulative Spend (₹ Cr)" stroke="#38bdf8" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="physical_progress_pct" name="Physical Progress (%)" stroke="#4ade80" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

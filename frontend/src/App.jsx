import React, { useState, useEffect } from 'react';
import Overview from './components/Overview';
import ProjectTable from './components/ProjectTable';
import ProjectDetailView from './components/ProjectDetailView';
import ChatDrawer from './components/ChatDrawer';
import { LayoutDashboard, ListFilter, Bot, Bell, Shield } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [alertStatus, setAlertStatus] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sRes = await fetch('http://localhost:8000/dashboard/summary');
        const sData = await sRes.json();
        setSummary(sData);

        const pRes = await fetch('http://localhost:8000/projects');
        const pData = await pRes.json();
        setProjects(pData);
      } catch (err) {
        console.error("API connection error:", err);
      }
    }
    loadData();
  }, []);

  const triggerEmailAlerts = async () => {
    try {
      const res = await fetch('http://localhost:8000/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: 'officer@mospi.gov.in' })
      });
      const data = await res.json();
      setAlertStatus(`Sent email alerts for ${data.red_projects_notified} Red Projects to officer@mospi.gov.in`);
      setTimeout(() => setAlertStatus(null), 5000);
    } catch (err) {
      alert("Error sending alerts");
    }
  };

  const handleSelectProject = (pid) => {
    setSelectedProjectId(pid);
    setActiveTab('detail');
  };

  const sectors = Array.from(new Set(projects.map(p => p.sector))).sort();
  const states = Array.from(new Set(projects.map(p => p.state))).sort();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>

      {/* Top Glass Navigation Header */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#3b82f6', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.5px' }}>
              PAIMANA <span style={{ color: '#38bdf8', fontWeight: 400 }}>Predictive Analytics</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              MoSPI • Data Informatics & Innovation Division (1,981+ Projects)
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#1e293b', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem',
              borderRadius: '6px', border: 'none', background: activeTab === 'overview' ? '#3b82f6' : 'transparent',
              color: activeTab === 'overview' ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <LayoutDashboard size={16} /> Overview & GIS Map
          </button>
          <button
            onClick={() => setActiveTab('table')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem',
              borderRadius: '6px', border: 'none', background: activeTab === 'table' ? '#3b82f6' : 'transparent',
              color: activeTab === 'table' ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <ListFilter size={16} /> Project Directory
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={triggerEmailAlerts}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239,68,68,0.15)',
              color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.45rem 0.85rem',
              borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
            }}
          >
            <Bell size={16} /> Dispatch Red Alerts
          </button>

          <button
            onClick={() => setIsChatOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#38bdf8',
              color: '#0f172a', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700
            }}
          >
            <Bot size={16} /> AI Chatbot
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {alertStatus && (
        <div style={{ background: '#065f46', color: '#34d399', padding: '0.6rem 2rem', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
          {alertStatus}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1.75rem 2rem' }}>
        {activeTab === 'overview' && (
          <Overview summary={summary} projects={projects} onSelectProject={handleSelectProject} />
        )}
        {activeTab === 'table' && (
          <ProjectTable projects={projects} onSelectProject={handleSelectProject} sectors={sectors} states={states} />
        )}
        {activeTab === 'detail' && selectedProjectId && (
          <ProjectDetailView projectId={selectedProjectId} onBack={() => setActiveTab('overview')} />
        )}
      </main>

      {/* Slide-out RAG Chatbot Drawer */}
      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

    </div>
  );
}

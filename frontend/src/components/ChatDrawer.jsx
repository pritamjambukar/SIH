import React, { useState } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';

export default function ChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! I am the PAIMANA Intelligence Assistant. Ask me anything about India infrastructure projects, high-risk sectors, or specific project overrun causes.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.answer, sources: data.retrieved_sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Error connecting to PAIMANA AI backend service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
      background: '#0f172a', borderLeft: '1px solid #334155', zIndex: 1000,
      display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)'
    }}>

      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: '#38bdf8' }}>
          <Bot size={20} /> PAIMANA AI Assistant (RAG)
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.sender === 'user' ? '#3b82f6' : '#1e293b',
              color: '#f8fafc',
              padding: '0.75rem 1rem',
              borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              fontSize: '0.88rem',
              lineHeight: 1.4
            }}
          >
            <div>{m.text}</div>
            {m.sources && m.sources.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.25rem' }}>
                Sources: {m.sources.join(', ')}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Analyzing project database...</div>}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid #334155', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Ask a question (e.g. Maharashtra highways)..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', outline: 'none', fontSize: '0.85rem' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
        >
          <Send size={16} />
        </button>
      </form>

    </div>
  );
}

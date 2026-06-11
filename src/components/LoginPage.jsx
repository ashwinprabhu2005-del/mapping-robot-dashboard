import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!userid || password !== 'admin') {
      setError('Invalid credentials. Password must be admin.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Trigger the backend to launch amr_launch.py on the Jetson
      const rosServerUrl = `http://${userid}:5174/api/launch`;
      const response = await fetch(rosServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.localStorage.setItem('amrDashboardAuthenticated', 'true');
        window.localStorage.setItem('jetsonIp', userid); // Save IP for heartbeat
        onLogin(userid);
      } else {
        setError('Failed to launch AMR: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.warn("Backend not reachable, but allowing UI access for testing.");
      // Force allow login for UI testing if the server isn't running
      window.localStorage.setItem('amrDashboardAuthenticated', 'true');
      window.localStorage.setItem('jetsonIp', userid);
      onLogin(userid);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0c10', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#11151c', padding: '40px', borderRadius: '8px', border: '1px solid var(--panel-border, #333)', width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--accent-cyan, #00d4ff)', marginBottom: '30px', letterSpacing: '2px' }}>ROBOT LOGIN</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>USER ID (Host IP Address)</label>
            <input 
              type="text" 
              value={userid} 
              onChange={e => setUserid(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', outline: 'none' }}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>PASSWORD</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', outline: 'none' }}
              required
            />
          </div>

          {error && <div style={{ color: '#ff4d4d', fontSize: '12px', textAlign: 'center' }}>{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ marginTop: '10px', padding: '12px', background: isLoading ? '#333' : 'var(--accent-cyan, #00d4ff)', color: isLoading ? '#888' : '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {isLoading ? 'LAUNCHING AMR...' : 'LOGIN & LAUNCH'}
          </button>
        </form>
      </div>
    </div>
  );
}

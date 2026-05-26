import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../utils/api';
import { Bot, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@robot.ai');
  const [password, setPassword] = useState('robot123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('All fields are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      loginUser(data.token, data.user);
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials. Try admin@robot.ai / robot123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse at 30% 40%, #0a1f3d 0%, var(--bg-base) 70%)', padding:'24px' }}>

      {/* Ambient grid */}
      <div style={{ position:'fixed', inset:0, backgroundImage:
        'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
        backgroundSize:'40px 40px', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'420px', position:'relative' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'72px', height:'72px', borderRadius:'20px', marginBottom:'16px',
            background:'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(59,130,246,0.2))',
            border:'1px solid rgba(0,212,255,0.3)', boxShadow:'0 0 40px rgba(0,212,255,0.15)' }}>
            <Bot size={36} color="var(--cyan)" />
          </div>
          <h1 style={{ fontSize:'26px', fontWeight:700, letterSpacing:'-0.03em', color:'var(--text-primary)' }}>
            Hyper<span style={{ color:'var(--cyan)' }} className="glow-cyan">vision</span>
          </h1>
          <p style={{ color:'var(--text-muted)', marginTop:'6px', fontSize:'13px' }}>
            AI Robotics Mapping &amp; Control Dashboard
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:'32px', border:'1px solid var(--border-bright)',
          boxShadow:'0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,255,0.04)' }}>

          <h2 style={{ fontSize:'16px', fontWeight:600, marginBottom:'24px', color:'var(--text-primary)' }}>
            Operator Sign In
          </h2>

          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px',
              borderRadius:'var(--radius-sm)', background:'rgba(244,63,94,0.1)',
              border:'1px solid rgba(244,63,94,0.25)', color:'var(--red)', marginBottom:'20px', fontSize:'13px' }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <label htmlFor="login-email"
                style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'6px' }}>
                Email Address
              </label>
              <div style={{ position:'relative' }}>
                <Mail size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input id="login-email" type="email" className="input" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="admin@robot.ai"
                  style={{ paddingLeft:'38px' }} autoComplete="username" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password"
                style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'6px' }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input id="login-password" type="password" className="input" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  style={{ paddingLeft:'38px' }} autoComplete="current-password" />
              </div>
            </div>

            <button id="login-submit" type="submit" className="btn btn-cyan"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'11px', marginTop:'8px', fontSize:'14px' }}>
              {loading ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Authenticating…</> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:'20px', fontSize:'12px', color:'var(--text-muted)' }}>
            Demo: <span style={{ color:'var(--cyan)', fontFamily:'var(--font-mono)' }}>admin@robot.ai</span> / <span style={{ color:'var(--cyan)', fontFamily:'var(--font-mono)' }}>robot123</span>
          </p>
        </div>

        <p style={{ textAlign:'center', marginTop:'24px', fontSize:'11px', color:'var(--text-muted)' }}>
          © 2026 Hypervision Systems · Secure Operator Access
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

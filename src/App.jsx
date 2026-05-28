import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    window.localStorage.getItem('amrDashboardAuthenticated') === 'true'
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Heartbeat to keep amr_launch.py alive
    const pingHeartbeat = async () => {
      try {
        const jetsonIp = window.localStorage.getItem('jetsonIp') || window.location.hostname;
        await fetch(`http://${jetsonIp}:5174/api/heartbeat`, {
          method: 'POST',
        });
      } catch (e) {
        console.error("Heartbeat error:", e);
      }
    };
    
    // Initial ping
    pingHeartbeat();
    const interval = setInterval(pingHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/dashboard"
          element={<Dashboard setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

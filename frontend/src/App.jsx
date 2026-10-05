import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useVault } from './VaultContext';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import VaultDashboard from './VaultDashboard';

export default function App() {
  // Pull the unlock status from our volatile memory context
  const { isUnlocked } = useVault();

  return (
    <div className="app-container">
      {/* Basic navigation bar */}
      <nav style={{ padding: '20px', borderBottom: '1px solid #333', marginBottom: '20px' }}>
        <Link to="/login" style={{ marginRight: '15px' }}>Login</Link>
        <Link to="/register">Register</Link>
      </nav>

      <main style={{ padding: '20px' }}>
        <Routes>
          {/* Public Registration Route */}
          <Route path="/register" element={<RegisterForm />} />
          
          {/* Public Login Route - Redirects to vault if already unlocked */}
          <Route 
            path="/login" 
            element={isUnlocked ? <Navigate to="/vault" replace /> : <LoginForm />} 
          />
          
          {/* Protected Vault Route - Kicks user back to login if key is missing from RAM */}
          <Route 
            path="/vault" 
            element={isUnlocked ? <VaultDashboard userEmail="Active User" /> : <Navigate to="/login" replace />} 
          />

          {/* Catch-all route redirects undefined URLs to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}
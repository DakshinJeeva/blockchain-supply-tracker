import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BatchPage from './pages/BatchPage.jsx';
import TransportPage from './pages/TransportPage.jsx';
import TracePage from './pages/TracePage.jsx';
import './index.css';

// ─── Nav config with org restrictions ─────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', section: 'main', orgs: null },
  { id: 'batch', label: 'Batch Management', section: 'production', badge: 'Org1', orgs: ['Org1'] },
  { id: 'transport', label: 'Transport', section: 'logistics', badge: 'Org2', orgs: ['Org2'] },
  { id: 'trace', label: 'Full Traceability', section: 'consumer', badge: 'Org3', orgs: ['Org3'] },
];

const SECTIONS = [
  { key: 'main', label: 'Overview' },
  { key: 'production', label: 'Production' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'consumer', label: 'Consumer' },
];

const ORG_STYLE = {
  Org1: { color: '#6366f1' },
  Org2: { color: '#0ea5e9' },
  Org3: { color: '#10b981' },
};

// ─── Main app shell (only rendered when authenticated) ────────────────────────
function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const orgStyle = ORG_STYLE[user?.org] || {};

  const canAccess = (navItem) => {
    if (!navItem.orgs) return true;           // open to all
    return navItem.orgs.includes(user?.org);  // restricted
  };

  const renderPage = () => {
    if (!canAccess(NAV.find(n => n.id === page))) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
          <h2 style={{ color: 'var(--text-primary)' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            This page is restricted. You are registered as <strong style={{ color: orgStyle.color }}>{user?.org}</strong>.
          </p>
        </div>
      );
    }
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'batch': return <BatchPage />;
      case 'transport': return <TransportPage />;
      case 'trace': return <TracePage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="app-layout">
      <div className="bg-mesh" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">Chain<span>Trace</span></div>
          <div className="logo-sub">Supply Chain Tracker</div>
        </div>

        {SECTIONS.map(sec => {
          const items = NAV.filter(n => n.section === sec.key);
          if (!items.length) return null;
          return (
            <div className="sidebar-section" key={sec.key}>
              <div className="sidebar-section-label">{sec.label}</div>
              {items.map(n => {
                const accessible = canAccess(n);
                return (
                  <div
                    key={n.id}
                    className={`sidebar-item ${page === n.id ? 'active' : ''} ${!accessible ? 'sidebar-item-locked' : ''}`}
                    onClick={() => accessible && setPage(n.id)}
                    title={!accessible ? `Requires ${n.badge}` : ''}
                  >
                    <span>{n.label}</span>
                    {n.badge && (
                      <span
                        className="sidebar-badge"
                        style={accessible ? { background: orgStyle.color } : {}}
                      >
                        {accessible ? n.badge : 'Locked'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* User info footer */}
        <div className="sidebar-user" onClick={() => setShowUserMenu(v => !v)}>
          <div className="sidebar-user-avatar" style={{ borderColor: orgStyle.color }}>
            {user?.picture
              ? <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
              : <span>{user?.name?.[0] || '?'}</span>}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-org" style={{ color: orgStyle.color }}>
              {user?.org}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>▾</span>
        </div>

        {showUserMenu && (
          <div className="sidebar-user-menu">
            <div className="sidebar-user-menu-email">{user?.email}</div>
            <button id="logout-btn" className="sidebar-logout-btn" onClick={logout}>
              🚪 Sign out
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 4 }}>Hyperledger Fabric</div>
          <div>Channel: <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>mychannel</span></div>
          <div>Chaincode: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>batchcc</span></div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {renderPage()}
      </main>
    </div>
  );
}

// ─── Root with auth routing ───────────────────────────────────────────────────
function Root() {
  const { user, loading } = useAuth();
  const [forcedPage, setForcedPage] = useState(() => window.location.pathname);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setForcedPage(path);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Handle OAuth callback
  if (forcedPage.startsWith('/auth/callback')) {
    return <AuthCallback onDone={navigate} />;
  }

  // Not logged in → login / signup
  if (!user) {
    return <LoginPage onLogin={() => navigate('/dashboard')} />;
  }

  // Logged in → app
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

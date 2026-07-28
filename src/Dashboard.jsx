import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './App';
import { LayoutDashboard, FileText, MessageSquare, LogOut, Users, Shield, Menu, X, Download } from 'lucide-react';
import './index.css';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("To install on iPhone/iPad: \n1. Open Safari\n2. Tap the Share button at the bottom\n3. Select 'Add to Home Screen'");
      } else {
        alert("App is either already installed, or your browser doesn't support automatic installation.\n\nLook for an 'Install' icon in your browser's address bar, or click 'Add to Home Screen' from your browser menu.");
      }
    }
  };

  const handleEnableNotifications = () => {
    if (window.OneSignal) {
      window.OneSignal.Slidedown.promptPush({ force: true });
    } else if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const userName = user?.name || 'Guest User';
  const initial = userName.charAt(0).toUpperCase();

  const showNotificationBtn = window.Notification && window.Notification.permission !== 'granted';

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="icon">
            <LayoutDashboard size={24} />
          </div>
          Project Hub
          <button 
            className="mobile-close-btn btn-icon" 
            onClick={closeSidebar}
            style={{ marginLeft: 'auto' }}
          >
            <X size={24} color="white" />
          </button>
        </div>

        <nav className="nav-links">
          <NavLink 
            to="/documents" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <FileText size={20} />
            Documents
          </NavLink>
          <NavLink 
            to="/chat" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <MessageSquare size={20} />
            Team Chat
          </NavLink>
          <NavLink 
            to="/members" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <Users size={20} />
            Members
          </NavLink>
          <button 
            className="nav-item" 
            onClick={() => {
              handleInstallClick();
              closeSidebar();
            }}
            style={{ width: '100%', background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: 'var(--primary)', marginTop: '16px', fontWeight: 'bold' }}
          >
            <Download size={20} />
            Install App
          </button>
          
          {showNotificationBtn && (
            <button 
              className="nav-item" 
              onClick={() => {
                handleEnableNotifications();
                closeSidebar();
              }}
              style={{ width: '100%', background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: 'var(--success)', marginTop: '8px', fontWeight: 'bold' }}
            >
              <Shield size={20} />
              Enable Notifications
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={handleLogout}
            className="nav-item"
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--danger)', marginTop: 'auto' }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="flex items-center gap-4">
            <button 
              className="hamburger-btn btn-icon" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="page-title">Workspace</div>
          </div>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-muted flex items-center gap-2">
              {userName}
              {user?.role === 'admin' && <Shield size={14} color="var(--primary)" />}
            </span>
            <div className="avatar">{initial}</div>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

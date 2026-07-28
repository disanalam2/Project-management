import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './App';
import { LayoutDashboard, FileText, MessageSquare, LogOut, Users, Shield } from 'lucide-react';
import './index.css';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = user?.name || 'Guest User';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="icon">
            <LayoutDashboard size={24} />
          </div>
          Project Hub
        </div>

        <nav className="nav-links">
          <NavLink 
            to="/documents" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <FileText size={20} />
            Documents
          </NavLink>
          <NavLink 
            to="/chat" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <MessageSquare size={20} />
            Team Chat
          </NavLink>
          <NavLink 
            to="/members" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={20} />
            Members
          </NavLink>
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
          <div className="page-title">Workspace</div>
          <div className="user-profile">
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

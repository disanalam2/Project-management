import React from 'react';

const RoleFilterBar = ({ roleFilter, setRoleFilter, totalCount, adminCount, memberCount }) => {
  return (
    <div className="role-filter-bar mb-4">
      <button 
        onClick={() => setRoleFilter('all')}
        className={`filter-btn ${roleFilter === 'all' ? 'active-all' : ''}`}
      >
        All ({totalCount})
      </button>
      <button 
        onClick={() => setRoleFilter('admin')}
        className={`filter-btn ${roleFilter === 'admin' ? 'active-admin' : ''}`}
      >
        🛡️ Admins ({adminCount})
      </button>
      <button 
        onClick={() => setRoleFilter('member')}
        className={`filter-btn ${roleFilter === 'member' ? 'active-member' : ''}`}
      >
        👤 Members ({memberCount})
      </button>
    </div>
  );
};

export default RoleFilterBar;

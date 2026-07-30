import React from 'react';
import { User, Clock, Shield, Trash2, Briefcase } from 'lucide-react';

const MemberCard = ({
  member,
  isAdmin,
  isMasterAdmin,
  currentUsername,
  usersData,
  designations,
  formatDate,
  handleChangeRole,
  handleRemoveMember,
  handleChangeDesignation
}) => {
  const isMasterUser = member.id === currentUsername || member.id === 'master admin';

  return (
    <div className="glass-panel member-card">
      <div className="member-card-header">
        <div className="flex items-center gap-4">
          <div 
            className="avatar member-avatar" 
            style={{ 
              background: member.role === 'admin' 
                ? 'linear-gradient(135deg, #6366f1, #a855f7)' 
                : 'linear-gradient(135deg, #10b981, #059669)'
            }}
          >
            {member.name ? member.name.charAt(0).toUpperCase() : <User size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="member-name">{member.name}</h3>
              
              {/* Access Role Badge */}
              <span className={`role-badge ${member.role === 'admin' ? 'role-admin' : 'role-member'}`}>
                {member.role === 'admin' ? (
                  <>
                    <Shield size={12} /> Admin
                  </>
                ) : (
                  <>
                    <User size={12} /> Member
                  </>
                )}
              </span>
            </div>

            {/* Serving Role Badge */}
            <div className="mt-1">
              <span className="designation-badge">
                <Briefcase size={12} color="var(--primary)" />
                {member.designation || 'Full Stack Developer'}
              </span>
            </div>
            
            <p className="text-muted text-sm flex items-center gap-1 mt-2">
              <Clock size={12} /> {member.lastActive ? `Last active: ${formatDate(member.lastActive)}` : 'Never logged in'}
            </p>
          </div>
        </div>
        
        {isAdmin && !isMasterUser && (
          <div className="flex items-center gap-2 member-actions">
            {isMasterAdmin && (
              <button 
                onClick={() => handleChangeRole(member.id, member.name, member.role)}
                className="btn-change-role"
                title="Change Access Role"
              >
                Make {member.role === 'admin' ? 'Member' : 'Admin'}
              </button>
            )}
            <button 
              onClick={() => handleRemoveMember(member.id, member.name)}
              className="btn-icon btn-remove-member"
              title="Remove User"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Admin Role Serving Selector */}
      {isAdmin && (
        <div className="serving-role-selector">
          <label>Change Serving Role (Designation):</label>
          <select 
            value={member.designation || 'Full Stack Developer'} 
            onChange={(e) => handleChangeDesignation(member.id, member.name, e.target.value)}
          >
            {designations.map((roleOpt) => (
              <option key={roleOpt} value={roleOpt}>
                {roleOpt}
              </option>
            ))}
          </select>
        </div>
      )}

      {isMasterAdmin && usersData[member.email || member.id] && (
        <div className="master-admin-info">
          <p className="text-muted text-sm"><strong>Email:</strong> {usersData[member.email || member.id].email}</p>
          <p className="text-muted text-sm"><strong>Pass:</strong> {usersData[member.email || member.id].password}</p>
        </div>
      )}
    </div>
  );
};

export default MemberCard;

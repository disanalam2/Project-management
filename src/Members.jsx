import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Users, User, Clock, Plus, Shield, Trash2 } from 'lucide-react';
import { useAuth } from './App';
import './index.css';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [usersData, setUsersData] = useState({}); // To hold passwords for admin view
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Add Member State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('member');
  
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isMasterAdmin = user?.role === 'admin' && user?.name === 'Master Admin';

  useEffect(() => {
    try {
      // 1. Fetch Members (for active status)
      const q = query(collection(db, 'members'), orderBy('lastActive', 'desc'));
      const unsubscribeMembers = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(docs);
        setLoading(false);
      }, (err) => {
        console.error("Firebase error:", err);
        setError("Please configure Firebase keys in .env to connect database.");
        setLoading(false);
      });

      // 2. Fetch Users (for passwords) if Admin
      let unsubscribeUsers = () => {};
      if (isMasterAdmin) {
        const qUsers = query(collection(db, 'users'));
        unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
          const uData = {};
          snapshot.docs.forEach(doc => {
            uData[doc.id] = doc.data();
          });
          setUsersData(uData);
        });
      }

      return () => {
        unsubscribeMembers();
        unsubscribeUsers();
      };
    } catch (err) {
      console.error(err);
      setError("Firebase is not configured correctly. Check .env file.");
      setLoading(false);
    }
  }, [isMasterAdmin]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;

    const emailId = newEmail.toLowerCase().trim();

    try {
      // Create user credential in 'users' collection
      await setDoc(doc(db, 'users', emailId), {
        name: newName.trim(),
        email: emailId,
        password: newPassword, // Note: In a real prod app, do not store plain text passwords
        role: newRole
      });

      // Optionally, add them to 'members' collection so they show up immediately
      await setDoc(doc(db, 'members', emailId), {
        name: newName.trim(),
        email: emailId,
        role: newRole,
        lastActive: null // null means they haven't logged in yet
      });
      
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('member');
      setShowAddModal(false);
      alert('Member added successfully!');
    } catch (err) {
      console.error("Error adding member: ", err);
      alert("Failed to add member. Ensure Firebase is configured.");
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!memberId) return;

    if (memberId === import.meta.env.VITE_APP_USERNAME || memberId === 'master admin') {
      alert("Cannot remove the Master Admin!");
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to remove ${memberName}? They will no longer be able to log in.`);
    if (!confirmDelete) return;

    try {
      // Delete from 'members' collection
      await deleteDoc(doc(db, 'members', memberId));
      // Delete from 'users' collection
      await deleteDoc(doc(db, 'users', memberId));
      
      alert(`${memberName} has been removed.`);
    } catch (err) {
      console.error("Error removing member: ", err);
      alert("Failed to remove member.");
    }
  };

  const handleChangeRole = async (memberId, memberName, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const confirmChange = window.confirm(`Change ${memberName}'s role to ${newRole.toUpperCase()}?`);
    if (!confirmChange) return;

    try {
      await setDoc(doc(db, 'members', memberId), { role: newRole }, { merge: true });
      await setDoc(doc(db, 'users', memberId), { role: newRole }, { merge: true });
      alert(`${memberName} is now an ${newRole}.`);
    } catch (err) {
      console.error("Error changing role: ", err);
      alert("Failed to change role.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Project Members</h2>
          <p className="text-muted text-sm mt-4">See who is working on the project.</p>
          
          {isMasterAdmin && (
            <div style={{ padding: '8px', marginTop: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontSize: '12px' }}>
              Master Admin Mode: Active | Users loaded: {Object.keys(usersData).length}
            </div>
          )}
        </div>
        
        {isAdmin && (
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Add User
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      <div className="responsive-grid">
        {loading ? (
          <p className="text-muted">Loading members...</p>
        ) : members.length > 0 ? (
          members.map(member => (
            <div key={member.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div className="flex items-center gap-4">
                  <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '20px', flexShrink: 0 }}>
                    {member.name ? member.name.charAt(0).toUpperCase() : <User size={24} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {member.name} 
                      {member.role === 'admin' && <Shield size={14} color="var(--primary)" />}
                    </h3>
                    
                    <p className="text-muted text-sm flex items-center gap-1 mt-1">
                      <Clock size={12} /> {member.lastActive ? `Last active: ${formatDate(member.lastActive)}` : 'Never logged in'}
                    </p>
                  </div>
                </div>
                
                {isAdmin && member.id !== import.meta.env.VITE_APP_USERNAME && member.id !== 'master admin' && (
                  <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                    {isMasterAdmin && (
                      <button 
                        onClick={() => handleChangeRole(member.id, member.name, member.role)}
                        style={{ color: 'var(--primary)', padding: '6px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}
                        title="Change Role"
                      >
                        Make {member.role === 'admin' ? 'Member' : 'Admin'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="btn-icon"
                      style={{ color: 'var(--danger)', padding: '6px' }}
                      title="Remove User"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>

              {isMasterAdmin && usersData[member.email || member.id] && (
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed var(--border-color)', marginTop: '4px' }}>
                  <p className="text-muted text-sm" style={{ fontSize: '13px', marginBottom: '4px' }}><strong>Email:</strong> {usersData[member.email || member.id].email}</p>
                  <p className="text-muted text-sm" style={{ fontSize: '13px' }}><strong>Pass:</strong> {usersData[member.email || member.id].password}</p>
                </div>
              )}
              
            </div>
          ))
        ) : (
          !error && <p className="text-muted">No members found.</p>
        )}
      </div>

      {/* Add Member Modal (Admin Only) */}
      {showAddModal && isAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="glass-panel animate-fade-in modal-panel" style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Add New User</h3>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%' }} required placeholder="e.g. Rahul Kumar" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Email (Login ID)</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%' }} required placeholder="rahul@project.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Password</label>
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%' }} required placeholder="Create a password" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                  <option value="member">Member (Can chat & upload docs)</option>
                  <option value="admin">Admin (Can also add users)</option>
                </select>
              </div>
              <div className="flex justify-between gap-4 mt-4" style={{ marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;

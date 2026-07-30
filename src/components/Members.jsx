import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus } from 'lucide-react';
import { useAuth } from '../App';
import RoleFilterBar from './RoleFilterBar';
import MemberCard from './MemberCard';
import AddUserModal from './AddUserModal';
import '../index.css';

const DESIGNATIONS = [
  'Project Lead',
  'Senior Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'App Frontend Developer'
];

const Members = () => {
  const [members, setMembers] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [newDesignation, setNewDesignation] = useState('Full Stack Developer');
  
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isMasterAdmin = user?.role === 'admin' && user?.name === 'Master Admin';

  useEffect(() => {
    try {
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date();
    return date.toLocaleString();
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;

    const emailId = newEmail.toLowerCase().trim();

    try {
      await setDoc(doc(db, 'users', emailId), {
        name: newName.trim(),
        email: emailId,
        password: newPassword,
        role: newRole,
        designation: newDesignation
      });

      await setDoc(doc(db, 'members', emailId), {
        name: newName.trim(),
        email: emailId,
        role: newRole,
        designation: newDesignation,
        lastActive: null
      });
      
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('member');
      setNewDesignation('Full Stack Developer');
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
      await deleteDoc(doc(db, 'members', memberId));
      await deleteDoc(doc(db, 'users', memberId));
      alert(`${memberName} has been removed.`);
    } catch (err) {
      console.error("Error removing member: ", err);
      alert("Failed to remove member.");
    }
  };

  const handleChangeRole = async (memberId, memberName, currentRole) => {
    const targetRole = currentRole === 'admin' ? 'member' : 'admin';
    const confirmChange = window.confirm(`Change ${memberName}'s access role to ${targetRole.toUpperCase()}?`);
    if (!confirmChange) return;

    try {
      await setDoc(doc(db, 'members', memberId), { role: targetRole }, { merge: true });
      await setDoc(doc(db, 'users', memberId), { role: targetRole }, { merge: true });
      alert(`${memberName} is now an ${targetRole}.`);
    } catch (err) {
      console.error("Error changing role: ", err);
      alert("Failed to change role.");
    }
  };

  const handleChangeDesignation = async (memberId, memberName, targetDesignation) => {
    try {
      await setDoc(doc(db, 'members', memberId), { designation: targetDesignation }, { merge: true });
      await setDoc(doc(db, 'users', memberId), { designation: targetDesignation }, { merge: true });
    } catch (err) {
      console.error("Error updating designation: ", err);
      alert("Failed to update serving role.");
    }
  };

  const filteredMembers = members.filter(member => {
    if (roleFilter === 'admin') return member.role === 'admin';
    if (roleFilter === 'member') return member.role !== 'admin';
    return true;
  });

  const adminCount = members.filter(m => m.role === 'admin').length;
  const memberCount = members.filter(m => m.role !== 'admin').length;

  return (
    <div className="animate-fade-in members-page">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div>
          <h2 className="page-heading">Project Members</h2>
          <p className="text-muted text-sm mt-1">See who is working on the project and their assigned serving roles.</p>
          
          {isMasterAdmin && (
            <div className="master-admin-badge">
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

      <RoleFilterBar 
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        totalCount={members.length}
        adminCount={adminCount}
        memberCount={memberCount}
      />

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="responsive-grid">
        {loading ? (
          <p className="text-muted">Loading members...</p>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map(member => (
            <MemberCard 
              key={member.id}
              member={member}
              isAdmin={isAdmin}
              isMasterAdmin={isMasterAdmin}
              currentUsername={import.meta.env.VITE_APP_USERNAME}
              usersData={usersData}
              designations={DESIGNATIONS}
              formatDate={formatDate}
              handleChangeRole={handleChangeRole}
              handleRemoveMember={handleRemoveMember}
              handleChangeDesignation={handleChangeDesignation}
            />
          ))
        ) : (
          !error && <p className="text-muted">No members found.</p>
        )}
      </div>

      <AddUserModal 
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        newName={newName}
        setNewName={setNewName}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        newDesignation={newDesignation}
        setNewDesignation={setNewDesignation}
        newRole={newRole}
        setNewRole={setNewRole}
        designations={DESIGNATIONS}
      />
    </div>
  );
};

export default Members;

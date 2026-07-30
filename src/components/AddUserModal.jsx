import React from 'react';
import { X } from 'lucide-react';

const AddUserModal = ({
  show,
  onClose,
  onSubmit,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  newPassword,
  setNewPassword,
  newDesignation,
  setNewDesignation,
  newRole,
  setNewRole,
  designations
}) => {
  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="glass-panel animate-fade-in modal-dialog">
        <div className="modal-header">
          <h3>Add New User</h3>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="modal-form">
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              required 
              placeholder="e.g. Rahul Kumar" 
            />
          </div>
          <div className="form-group">
            <label>Email (Login ID)</label>
            <input 
              type="email" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              required 
              placeholder="rahul@project.com" 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="text" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              required 
              placeholder="Create a password" 
            />
          </div>
          <div className="form-group">
            <label>Serving Role (Designation)</label>
            <select 
              value={newDesignation} 
              onChange={e => setNewDesignation(e.target.value)}
            >
              {designations.map((roleOpt) => (
                <option key={roleOpt} value={roleOpt}>
                  {roleOpt}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Access Role</label>
            <select 
              value={newRole} 
              onChange={e => setNewRole(e.target.value)}
            >
              <option value="member">Member (Can chat & upload docs)</option>
              <option value="admin">Admin (Can also add users & change roles)</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-primary">Add User</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;

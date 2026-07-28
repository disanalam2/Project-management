import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Search, Plus, ExternalLink, Link as LinkIcon, FileText } from 'lucide-react';
import './index.css';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLink, setNewLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDocuments(docs);
        setLoading(false);
      }, (err) => {
        console.error("Firebase error:", err);
        setError("Please configure Firebase keys in .env to connect database.");
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setError("Firebase is not configured correctly. Check .env file.");
      setLoading(false);
    }
  }, []);

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newTitle || !newLink) return;

    try {
      await addDoc(collection(db, 'documents'), {
        title: newTitle,
        description: newDescription,
        url: newLink,
        createdAt: serverTimestamp()
      });
      
      setNewTitle('');
      setNewDescription('');
      setNewLink('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding document: ", err);
      alert("Failed to add document. Ensure Firebase is configured.");
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Project Documents</h2>
          <p className="text-muted text-sm mt-4">Manage and access all your important links in one place.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Document
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search documents by title or description..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', paddingLeft: '48px', paddingRight: '16px', height: '48px', fontSize: '15px' }}
        />
      </div>

      {/* Document Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {loading ? (
          <p className="text-muted">Loading documents...</p>
        ) : filteredDocs.length > 0 ? (
          filteredDocs.map(doc => (
            <div key={doc.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center gap-4 mb-4">
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{doc.title}</h3>
                </div>
              </div>
              <p className="text-muted text-sm" style={{ flexGrow: 1, marginBottom: '24px' }}>{doc.description || 'No description provided.'}</p>
              <a 
                href={doc.url.startsWith('http') ? doc.url : `https://${doc.url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}
              >
                Open Link <ExternalLink size={16} />
              </a>
            </div>
          ))
        ) : (
          !error && <p className="text-muted">No documents found.</p>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Add New Document</h3>
            <form onSubmit={handleAddDocument} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Title (kya hai is link me)</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%' }} required placeholder="e.g. Project Plan Docs" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Description (optional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="Add some details about this link..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>URL / Link</label>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={newLink} onChange={e => setNewLink(e.target.value)} style={{ width: '100%', paddingLeft: '40px' }} required placeholder="https://..." />
                </div>
              </div>
              <div className="flex justify-between gap-4 mt-4" style={{ marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>Save Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;

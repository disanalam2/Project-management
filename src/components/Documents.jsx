import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Plus, ExternalLink, Link as LinkIcon, FileText, Trash2, X } from 'lucide-react';
import { useAuth } from '../App';
import '../index.css';

const Documents = () => {
  const { user } = useAuth();
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
        const docs = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
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

    const sendPushNotification = async (docTitle) => {
      const isMasterAdmin = user?.role === 'admin' && user?.name === 'Master Admin';
      if (isMasterAdmin) return;
      try {
        await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${import.meta.env.VITE_ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify({
            app_id: import.meta.env.VITE_ONESIGNAL_APP_ID,
            included_segments: ["Total Subscriptions"],
            headings: { en: "New Document Uploaded" },
            contents: { en: `${user?.name || 'Someone'} added: ${docTitle}` },
            url: window.location.origin + "/documents"
          })
        });
      } catch (error) {
        console.error("Failed to send push notification", error);
      }
    };

    try {
      await addDoc(collection(db, 'documents'), {
        title: newTitle,
        description: newDescription,
        url: newLink,
        createdAt: serverTimestamp()
      });
      
      sendPushNotification(newTitle);
      
      setNewTitle('');
      setNewDescription('');
      setNewLink('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding document: ", err);
      alert("Failed to add document. Ensure Firebase is configured.");
    }
  };

  const filteredDocs = documents.filter(docItem => 
    docItem.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    docItem.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Project Documents</h2>
          <p className="text-muted text-sm mt-1">Manage and access all your important links in one place.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Document
        </button>
      </div>

      {error && (
        <div className="error-banner">
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
      <div className="responsive-grid">
        {loading ? (
          <p className="text-muted">Loading documents...</p>
        ) : filteredDocs.length > 0 ? (
          filteredDocs.map(documentItem => (
            <div key={documentItem.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center gap-4 mb-4">
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{documentItem.title}</h3>
                </div>
              </div>
              <p className="text-muted text-sm" style={{ flexGrow: 1, marginBottom: '24px' }}>{documentItem.description || 'No description provided.'}</p>
              
              <div className="flex gap-2">
                <a 
                  href={documentItem.url.startsWith('http') ? documentItem.url : `https://${documentItem.url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}
                >
                  Open Link <ExternalLink size={16} />
                </a>
                
                {user?.role === 'admin' && (
                  <button 
                    onClick={async () => {
                      if(window.confirm('Delete this document?')) {
                        await deleteDoc(doc(db, 'documents', documentItem.id)); 
                      }
                    }}
                    style={{ padding: '0 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}
                    title="Delete Document"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          !error && <p className="text-muted">No documents found.</p>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="glass-panel animate-fade-in modal-dialog">
            <div className="modal-header">
              <h3>Add New Document</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddDocument} className="modal-form">
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="e.g. Project Plan Docs" />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Add details..." />
              </div>
              <div className="form-group">
                <label>URL / Link</label>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={newLink} onChange={e => setNewLink(e.target.value)} style={{ width: '100%', paddingLeft: '40px' }} required placeholder="https://..." />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-primary">Save Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;

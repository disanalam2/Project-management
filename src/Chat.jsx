import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Send, User } from 'lucide-react';
import { useAuth } from './App';
import './index.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const currentUser = user?.name || 'Guest';

  useEffect(() => {
    try {
      const q = query(collection(db, 'chats'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
        setLoading(false);
        scrollToBottom();
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage(''); // optimistic clear
    
    try {
      await addDoc(collection(db, 'chats'), {
        text: msgText,
        sender: currentUser,
        createdAt: serverTimestamp()
      });
      scrollToBottom();
    } catch (err) {
      console.error("Error sending message: ", err);
      alert("Failed to send message. Ensure Firebase is configured.");
      setNewMessage(msgText); // restore if failed
    }
  };

  return (
    <div className="animate-fade-in flex" style={{ flexDirection: 'column', height: '100%' }}>
      <div className="mb-4">
        <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Team Chat</h2>
        <p className="text-muted text-sm mt-4">Communicate with your team here.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      <div className="glass-panel flex" style={{ flexDirection: 'column', flexGrow: 1, overflow: 'hidden', padding: 0 }}>
        
        {/* Chat History */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div className="text-muted text-center mt-4">Loading messages...</div>
          ) : messages.length > 0 ? (
            messages.map((msg, index) => (
              <div key={msg.id || index} style={{ alignSelf: 'flex-start', maxWidth: '75%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                    <User size={12} />
                  </div>
                  <span className="text-muted text-sm">{msg.sender}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: '0 16px 16px 16px', color: 'var(--text-main)', fontSize: '15px' }}>
                  {msg.text}
                </div>
              </div>
            ))
          ) : (
            !error && <div className="text-muted text-center mt-4">No messages yet. Start the conversation!</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flexGrow: 1, background: 'rgba(255,255,255,0.05)', border: 'none' }}
          />
          <button type="submit" className="btn-primary flex items-center justify-center gap-2" style={{ padding: '10px 20px', borderRadius: '8px' }}>
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Chat;

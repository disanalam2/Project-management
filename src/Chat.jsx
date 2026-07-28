import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Send, User, Reply, X, Trash2 } from 'lucide-react';
import { useAuth } from './App';
import './index.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const currentUser = user?.name || 'Guest';
  const isMasterAdmin = user?.role === 'admin' && user?.name === 'Master Admin';

  const handleDeleteMessage = async (msgId) => {
    if(window.confirm('Delete this message?')) {
      try {
        await deleteDoc(doc(db, 'chats', msgId));
      } catch (err) {
        console.error("Error deleting: ", err);
      }
    }
  };

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
    const replyData = replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : null;
    
    setNewMessage(''); // optimistic clear
    setReplyingTo(null); // clear reply state
    
    const sendPushNotification = async (messageText) => {
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
            headings: { en: "New message in Team Chat" },
            contents: { en: `${currentUser}: ${messageText}` },
            url: window.location.origin + "/chat"
          })
        });
      } catch (error) {
        console.error("Failed to send push notification", error);
      }
    };
    
    try {
      await addDoc(collection(db, 'chats'), {
        text: msgText,
        sender: currentUser,
        replyTo: replyData,
        createdAt: serverTimestamp()
      });
      scrollToBottom();
      
      // Fire push notification in background
      sendPushNotification(msgText);
      
    } catch (err) {
      console.error("Error sending message: ", err);
      alert("Failed to send message. Ensure Firebase is configured.");
      setNewMessage(msgText); // restore if failed
      setReplyingTo(replyingTo);
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
            messages.map((msg, index) => {
              const isMine = msg.sender === currentUser;
              return (
                <div key={msg.id || index} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  
                  {!isMine && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                        <User size={12} />
                      </div>
                      <span className="text-muted text-sm">{msg.sender}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    
                    <div className="chat-message-bubble" style={{ 
                      background: isMine ? 'var(--primary)' : 'rgba(255,255,255,0.08)', 
                      borderRadius: isMine ? '16px 16px 0 16px' : '0 16px 16px 16px', 
                      color: 'white', 
                      position: 'relative',
                      boxShadow: isMine ? '0 4px 14px rgba(99, 102, 241, 0.2)' : 'none'
                    }}>
                      
                      {msg.replyTo && (
                        <div style={{ 
                          background: 'rgba(0,0,0,0.2)', 
                          padding: '8px', 
                          borderRadius: '6px', 
                          borderLeft: '3px solid rgba(255,255,255,0.5)', 
                          marginBottom: '8px',
                          fontSize: '13px',
                          opacity: 0.9
                        }}>
                          <strong style={{ display: 'block', fontSize: '11px', marginBottom: '2px', opacity: 0.8 }}>{msg.replyTo.sender}</strong>
                          {msg.replyTo.text.length > 50 ? msg.replyTo.text.substring(0, 50) + '...' : msg.replyTo.text}
                        </div>
                      )}
                      
                      {msg.text}
                    </div>

                    {/* Reply Button - shows on hover or permanently as a small icon */}
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="btn-icon"
                      style={{ padding: '6px', opacity: 0.7 }}
                      title="Reply"
                    >
                      <Reply size={16} />
                    </button>

                    {/* Master Admin Delete Button */}
                    {isMasterAdmin && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="btn-icon"
                        style={{ padding: '6px', opacity: 0.7, color: 'var(--danger)' }}
                        title="Delete Message"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                  </div>
                  
                  {isMine && (
                    <div style={{ marginTop: '4px', marginRight: '4px' }}>
                      <span className="text-muted text-sm" style={{ fontSize: '11px' }}>You</span>
                    </div>
                  )}
                  
                </div>
              );
            })
          ) : (
            !error && <div className="text-muted text-center mt-4">No messages yet. Start the conversation!</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Indicator */}
        {replyingTo && (
          <div style={{ padding: '12px 24px', background: 'rgba(99, 102, 241, 0.1)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>Replying to {replyingTo.sender}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                {replyingTo.text}
              </span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="btn-icon" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="chat-input-area">
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

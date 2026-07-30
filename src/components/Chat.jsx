import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, User, Reply, X, Trash2, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../App';
import '../index.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const currentUser = user?.name || 'Guest';
  const currentUserId = user?.email || user?.id || currentUser;
  const currentUserDesignation = user?.designation || (user?.role === 'admin' ? 'Project Lead' : 'Full Stack Developer');
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
    // Listen to members to build real-time name -> designation map
    const unsubscribeMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const map = {};
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.name) {
          map[data.name] = data.designation;
        }
      });
      setMembersMap(map);
    }, (err) => console.error("Members fetch error:", err));

    try {
      const q = query(collection(db, 'chats'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          if (data.sender !== currentUser) {
            const seenBy = data.seenBy || [];
            if (!seenBy.includes(currentUserId)) {
              updateDoc(doc(db, 'chats', docSnapshot.id), {
                seenBy: [...seenBy, currentUserId]
              }).catch(() => {});
            }
          }
          return { id: docSnapshot.id, ...data };
        });

        setMessages(msgs);
        setLoading(false);
        scrollToBottom();
      }, (err) => {
        console.error("Firebase error:", err);
        setError("Please configure Firebase keys in .env to connect database.");
        setLoading(false);
      });

      return () => {
        unsubscribeMembers();
        unsubscribe();
      };
    } catch (err) {
      console.error(err);
      setError("Firebase is not configured correctly. Check .env file.");
      setLoading(false);
    }
  }, [currentUser, currentUserId]);

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
    
    setNewMessage('');
    setReplyingTo(null);
    
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
        senderId: currentUserId,
        senderDesignation: currentUserDesignation,
        replyTo: replyData,
        createdAt: serverTimestamp(),
        seenBy: [currentUserId]
      });
      scrollToBottom();
      sendPushNotification(msgText);
    } catch (err) {
      console.error("Error sending message: ", err);
      alert("Failed to send message. Ensure Firebase is configured.");
      setNewMessage(msgText);
      setReplyingTo(replyingTo);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in flex" style={{ flexDirection: 'column', height: '100%' }}>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="glass-panel flex whatsapp-chat-container">
        <div className="whatsapp-history">
          {loading ? (
            <div className="text-muted text-center mt-4">Loading messages...</div>
          ) : messages.length > 0 ? (
            messages.map((msg, index) => {
              const isMine = msg.sender === currentUser;
              const seenByOther = (msg.seenBy || []).some(id => id !== currentUserId && id !== msg.senderId);
              const userRole = membersMap[msg.sender] || msg.senderDesignation || (msg.sender === 'Master Admin' ? 'Project Lead' : 'Full Stack Developer');
              
              return (
                <div 
                  key={msg.id || index} 
                  className={`chat-bubble-wrapper ${isMine ? 'mine' : 'other'}`}
                >
                  <div className={`chat-bubble-content ${isMine ? 'mine-flex' : 'other-flex'}`}>
                    
                    {!isMine && (
                      <div className="avatar chat-avatar">
                        {msg.sender ? msg.sender.charAt(0).toUpperCase() : <User size={14} />}
                      </div>
                    )}

                    <div className={`chat-message-bubble ${isMine ? 'bubble-mine' : 'bubble-other'}`}>
                      <div className="sender-tag-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {!isMine && (
                          <span className="sender-tag" style={{ margin: 0 }}>
                            {msg.sender}
                          </span>
                        )}
                        <span className="sender-role-tag" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px', opacity: 0.9, fontWeight: '500' }}>
                          {userRole}
                        </span>
                      </div>
                      
                      {msg.replyTo && (
                        <div className="quote-box">
                          <strong className="quote-sender">
                            {msg.replyTo.sender}
                          </strong>
                          {msg.replyTo.text.length > 55 ? msg.replyTo.text.substring(0, 55) + '...' : msg.replyTo.text}
                        </div>
                      )}
                      
                      <div className="bubble-text-flex">
                        <span className="bubble-text">
                          {msg.text}
                        </span>

                        <div className="bubble-meta">
                          <span>{formatTime(msg.createdAt)}</span>
                          
                          {isMine && (
                            <span className="ticks-span">
                              {seenByOther ? (
                                <CheckCheck size={15} color="#38bdf8" />
                              ) : msg.createdAt ? (
                                <CheckCheck size={15} color="rgba(255, 255, 255, 0.7)" />
                              ) : (
                                <Check size={15} color="rgba(255, 255, 255, 0.7)" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="bubble-actions">
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="btn-icon"
                        title="Reply"
                      >
                        <Reply size={16} />
                      </button>

                      {isMasterAdmin && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="btn-icon text-danger"
                          title="Delete Message"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                  </div>
                </div>
              );
            })
          ) : (
            !error && <div className="text-muted text-center mt-4">No messages yet. Start the conversation!</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {replyingTo && (
          <div className="reply-indicator">
            <div className="flex flex-column">
              <span className="reply-title">Replying to {replyingTo.sender}</span>
              <span className="reply-text">
                {replyingTo.text}
              </span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="btn-icon text-muted">
              <X size={18} />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="chat-input-area">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button 
            type="submit" 
            className="btn-primary send-btn"
          >
            <Send size={20} style={{ marginLeft: '2px' }} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Chat;

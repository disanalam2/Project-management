import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Send, User, Reply, X, Trash2 } from 'lucide-react';
import { useAuth } from './App';
import './index.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
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
      
      const qMembers = query(collection(db, 'members'));
      const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
        const docs = snapshot.docs.map(doc => doc.data());
        setMembers(docs);
      });
      
      return () => {
        unsubscribe();
        unsubscribeMembers();
      };
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    
    // Mention logic
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];
    
    if (currentWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(currentWord.slice(1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (memberName) => {
    if (!inputRef.current) return;
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = newMessage.slice(0, cursorPosition);
    const textAfterCursor = newMessage.slice(cursorPosition);
    
    const words = textBeforeCursor.split(/\s+/);
    words.pop(); // remove the @query word
    
    const newTextBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + `@${memberName} `;
    setNewMessage(newTextBefore + textAfterCursor);
    setShowMentions(false);
    inputRef.current.focus();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    const replyData = replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : null;
    
    setNewMessage(''); // optimistic clear
    setReplyingTo(null); // clear reply state
    setShowMentions(false);
    
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

  // Group messages by date
  const groupedMessages = {};
  messages.forEach(msg => {
    const dateObj = msg.createdAt ? msg.createdAt.toDate() : new Date();
    const dateStr = dateObj.toLocaleDateString();
    
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    
    let displayDate = dateStr;
    if (dateStr === today) displayDate = 'Today';
    else if (dateStr === yesterday) displayDate = 'Yesterday';
    else {
      displayDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    if (!groupedMessages[displayDate]) {
      groupedMessages[displayDate] = [];
    }
    groupedMessages[displayDate].push(msg);
  });

  const renderMessageText = (text) => {
    const words = text.split(' ');
    return words.map((word, i) => {
      if (word.startsWith('@')) {
        return <span key={i} style={{ color: '#a5b4fc', fontWeight: 'bold' }}>{word} </span>;
      }
      return word + ' ';
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            Object.keys(groupedMessages).map((date) => (
              <React.Fragment key={date}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {date}
                  </div>
                </div>
                {groupedMessages[date].map((msg, index) => {
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
                          boxShadow: isMine ? '0 4px 14px rgba(99, 102, 241, 0.2)' : 'none',
                          paddingRight: '48px', // Make room for timestamp
                          minWidth: '80px'
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
                          
                          {renderMessageText(msg.text)}

                          <span style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '8px',
                            fontSize: '10px',
                            opacity: 0.7,
                            whiteSpace: 'nowrap'
                          }}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>

                        {/* Reply Button */}
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
                    </div>
                  );
                })}
              </React.Fragment>
            ))
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

        {/* Message Input Container */}
        <div style={{ position: 'relative' }}>
          {/* Mentions Dropdown */}
          {showMentions && (
            <div style={{
              position: 'absolute', 
              bottom: '100%', 
              left: '24px', 
              background: 'var(--panel-bg, rgba(20,20,30,0.95))', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px',
              width: '250px',
              maxHeight: '150px',
              overflowY: 'auto',
              marginBottom: '8px',
              zIndex: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)'
            }}>
              {members.filter(m => m.name && m.name.toLowerCase().includes(mentionQuery)).length > 0 ? (
                members.filter(m => m.name && m.name.toLowerCase().includes(mentionQuery)).map(m => (
                  <div 
                    key={m.email || m.name}
                    onClick={() => insertMention(m.name)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}
                    className="hover:bg-white/10"
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {m.name}
                  </div>
                ))
              ) : (
                <div style={{ padding: '10px 14px', fontSize: '14px', color: 'var(--text-muted)' }}>No members found</div>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="chat-input-area" style={{ margin: 0, borderTop: '1px solid var(--border-color)' }}>
            <input 
              ref={inputRef}
              type="text" 
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message... (Use @ to tag)"
              style={{ flexGrow: 1, background: 'rgba(255,255,255,0.05)', border: 'none' }}
            />
            <button type="submit" className="btn-primary flex items-center justify-center gap-2" style={{ padding: '10px 20px', borderRadius: '8px' }}>
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Chat;

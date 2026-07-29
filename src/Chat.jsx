import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Send, User, Reply, X, Trash2, Hash } from 'lucide-react';
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
    words.pop(); 
    
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
    
    setNewMessage('');
    setReplyingTo(null);
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
      sendPushNotification(msgText);
      
    } catch (err) {
      console.error("Error sending message: ", err);
      alert("Failed to send message. Ensure Firebase is configured.");
      setNewMessage(msgText);
      setReplyingTo(replyingTo);
    }
  };

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
        return <span key={i} style={{ color: '#c7d2fe', fontWeight: 'bold' }}>{word} </span>;
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
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-center" style={{ padding: '0 8px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
              <Hash size={24} color="var(--primary)" />
            </div>
            Team Chat
          </h2>
          <p className="text-muted text-sm mt-2" style={{ marginLeft: '46px' }}>Real-time collaboration with your team.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Main Chat Panel */}
      <div className="glass-panel chat-container flex" style={{ flexDirection: 'column', flexGrow: 1, overflow: 'hidden', padding: 0, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
        
        {/* Chat History */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div className="text-muted text-center mt-8">Loading messages...</div>
          ) : messages.length > 0 ? (
            Object.keys(groupedMessages).map((date) => (
              <React.Fragment key={date}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0 8px' }}>
                  <div className="chat-date-divider">
                    {date}
                  </div>
                </div>
                {groupedMessages[date].map((msg, index) => {
                  const isMine = msg.sender === currentUser;
                  return (
                    <div key={msg.id || index} className="animate-fade-in" style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      
                      {!isMine && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', marginLeft: '4px' }}>
                          <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                            {msg.sender.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-muted" style={{ fontSize: '13px', fontWeight: '500' }}>{msg.sender}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                        
                        {/* Bubble */}
                        <div className={`chat-message-bubble ${isMine ? 'chat-bubble-sent' : 'chat-bubble-received'}`} style={{ 
                          color: 'white', 
                          position: 'relative',
                          paddingRight: '64px',
                          minWidth: '100px'
                        }}>
                          
                          {/* Reply Context */}
                          {msg.replyTo && (
                            <div style={{ 
                              background: 'rgba(0,0,0,0.25)', 
                              padding: '10px 12px', 
                              borderRadius: '8px', 
                              borderLeft: '4px solid rgba(255,255,255,0.7)', 
                              marginBottom: '10px',
                              fontSize: '13px',
                              opacity: 0.95
                            }}>
                              <strong style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.8, color: isMine ? '#c7d2fe' : 'var(--primary)' }}>
                                Replying to {msg.replyTo.sender}
                              </strong>
                              {msg.replyTo.text.length > 60 ? msg.replyTo.text.substring(0, 60) + '...' : msg.replyTo.text}
                            </div>
                          )}
                          
                          {/* Text */}
                          <div style={{ wordBreak: 'break-word' }}>
                            {renderMessageText(msg.text)}
                          </div>

                          {/* Time */}
                          <span style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '12px',
                            fontSize: '10px',
                            opacity: 0.7,
                            whiteSpace: 'nowrap',
                            fontWeight: '500'
                          }}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '4px', opacity: 0.6, transition: 'opacity 0.2s' }} className="hover:opacity-100">
                          <button 
                            onClick={() => setReplyingTo(msg)}
                            className="btn-icon"
                            style={{ padding: '6px' }}
                            title="Reply"
                          >
                            <Reply size={16} />
                          </button>

                          {isMasterAdmin && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="btn-icon"
                              style={{ padding: '6px', color: 'var(--danger)' }}
                              title="Delete Message"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            !error && <div className="text-muted text-center mt-8">No messages yet. Start the conversation!</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Indicator (Above Input) */}
        {replyingTo && (
          <div className="reply-indicator-pill animate-fade-in">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginBottom: '2px' }}>Replying to {replyingTo.sender}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                {replyingTo.text}
              </span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="btn-icon" style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>
        )}

        {/* Floating Input Area */}
        <div className="chat-floating-input-container">
          
          {/* Mentions Dropdown */}
          {showMentions && (
            <div className="mentions-dropdown animate-fade-in">
              {members.filter(m => m.name && m.name.toLowerCase().includes(mentionQuery)).length > 0 ? (
                members.filter(m => m.name && m.name.toLowerCase().includes(mentionQuery)).map(m => (
                  <div 
                    key={m.email || m.name}
                    onClick={() => insertMention(m.name)}
                    className="mention-item"
                  >
                    <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    {m.name}
                  </div>
                ))
              ) : (
                <div style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>No members found</div>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="chat-input-pill">
            <input 
              ref={inputRef}
              type="text" 
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type your message... (Use @ to tag)"
            />
            <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Chat;

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Send, User, Reply, X, Trash2, Check, CheckCheck, MoreVertical, Eye, Copy, Edit2, Smile, Users, Mic, Square, Video } from 'lucide-react';
import { useAuth } from '../App';
import VideoCall from './VideoCall';
import '../index.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [documentsList, setDocumentsList] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popupType, setPopupType] = useState(null);
  const [popupSearch, setPopupSearch] = useState('');
  const [idToNameMap, setIdToNameMap] = useState({});
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState('');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  
  // Video Call State
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [activeCallParticipants, setActiveCallParticipants] = useState([]);

  const currentUser = user?.name || 'Guest';
  const currentUserId = user?.email || user?.id || currentUser;
  const currentUserDesignation = user?.designation || (user?.name === 'Master Admin' ? 'Project Lead' : 'Full Stack Developer');
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
      const idMap = {};
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.name) {
          let defaultDes = 'Full Stack Developer';
          if (data.name === 'Master Admin') defaultDes = 'Project Lead';
          map[data.name] = data.designation || defaultDes;
          idMap[docSnap.id] = data.name;
        }
      });
      setMembersMap(map);
      setIdToNameMap(idMap);
    }, (err) => console.error("Members fetch error:", err));

    const unsubscribeDocuments = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docsData = snapshot.docs.map(docSnap => docSnap.data());
      setDocumentsData(docsData);
      
      const docs = docsData.map(d => d.title || d.name).filter(Boolean);
      setDocumentsList(docs);
    }, (err) => console.error("Documents fetch error:", err));

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
        unsubscribe();
        unsubscribeMembers();
        unsubscribeDocuments();
      };
    } catch (err) {
      console.error(err);
      setError("Firebase is not configured correctly. Check .env file.");
      setLoading(false);
    }
  }, [currentUser, currentUserId]);

  useEffect(() => {
    // Listen to active video calls
    const unsubscribeCall = onSnapshot(doc(db, 'active_calls', 'main_room'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveCallParticipants(data.participants || []);
      } else {
        setActiveCallParticipants([]);
      }
    });
    return () => unsubscribeCall();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Microphone access is required to send voice notes.");
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setRecordingDuration(0);

        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (!cancel) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedVoiceBlob(audioBlob);
        } else {
          setRecordedVoiceBlob(null);
        }
      };
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecordedVoice = () => {
    setRecordedVoiceBlob(null);
  };

  const sendRecordedVoice = async () => {
    if (!recordedVoiceBlob) return;
    const blobToUpload = recordedVoiceBlob;
    setRecordedVoiceBlob(null); // clear immediately so UI updates
    await uploadVoiceNote(blobToUpload);
  };

  const uploadVoiceNote = async (audioBlob) => {
    try {
      const audioRef = ref(storage, `voice_notes/${Date.now()}_${currentUserId}.webm`);
      await uploadBytes(audioRef, audioBlob);
      const downloadURL = await getDownloadURL(audioRef);
      
      const replyData = replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender,
        text: replyingTo.type === 'audio' ? '🎤 Voice Note' : replyingTo.text
      } : null;

      await addDoc(collection(db, 'chats'), {
        type: 'audio',
        audioUrl: downloadURL,
        sender: currentUser,
        senderId: currentUserId,
        senderDesignation: currentUserDesignation,
        replyTo: replyData,
        createdAt: serverTimestamp(),
        seenBy: [currentUserId]
      });
      scrollToBottom();
      setReplyingTo(null);
    } catch (err) {
      console.error("Error uploading voice note: ", err);
      alert("Failed to send voice note.");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    const replyData = replyingTo ? { id: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : null;
    
    setNewMessage('');
    setReplyingTo(null);
    
    const sendPushNotification = async (messageText) => {
      try {
        const currentUserName = currentUser.replace(/\s+/g, '_');
        const mentions = messageText.match(/@([a-zA-Z0-9_]+)/g);
        
        const basePayload = {
          app_id: import.meta.env.VITE_ONESIGNAL_APP_ID,
          url: window.location.origin + "/chat",
          contents: { en: `${currentUser}: ${messageText}` }
        };

        let payloads = [];

        if (mentions && mentions.length > 0) {
          if (mentions.includes('@Everyone')) {
            payloads.push({
              ...basePayload,
              headings: { en: "Team Update" },
              filters: [{ field: "tag", key: "name", relation: "!=", value: currentUserName }]
            });
          } else {
            // Payload 1: To the mentioned people/groups
            let mentionFilters = [];
            // Payload 2: To everyone else (excluding sender and mentioned people)
            let excludeFilters = [{ field: "tag", key: "name", relation: "!=", value: currentUserName }];
            
            mentions.forEach((m, idx) => {
               const tag = m.substring(1); 
               if (idx > 0) mentionFilters.push({ operator: "OR" });
               mentionFilters.push({ field: "tag", key: "name", relation: "=", value: tag });
               mentionFilters.push({ operator: "OR" });
               mentionFilters.push({ field: "tag", key: "role", relation: "=", value: tag });
               
               excludeFilters.push({ field: "tag", key: "name", relation: "!=", value: tag });
               excludeFilters.push({ field: "tag", key: "role", relation: "!=", value: tag });
            });
            
            payloads.push({
              ...basePayload,
              headings: { en: `You were mentioned in Team Chat` },
              filters: mentionFilters
            });
            
            payloads.push({
              ...basePayload,
              headings: { en: "New message in Team Chat" },
              filters: excludeFilters
            });
          }
        } else {
          payloads.push({
            ...basePayload,
            headings: { en: "New message in Team Chat" },
            filters: [{ field: "tag", key: "name", relation: "!=", value: currentUserName }]
          });
        }

        for (const payload of payloads) {
          await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${import.meta.env.VITE_ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify(payload)
          });
        }
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    
    const matchMention = val.match(/@([a-zA-Z0-9_]*)$/);
    const matchDoc = val.match(/#([a-zA-Z0-9_]*)$/);
    
    if (matchMention) {
      setPopupType('mention');
      setPopupSearch(matchMention[1].toLowerCase());
    } else if (matchDoc) {
      setPopupType('document');
      setPopupSearch(matchDoc[1].toLowerCase());
    } else {
      setPopupType(null);
    }
  };

  const getFilteredOptions = () => {
    let options = [];
    if (popupType === 'mention') {
      const people = Object.keys(membersMap).map(name => name.replace(/\s+/g, '_'));
      const uniqueRoles = [...new Set(Object.values(membersMap).map(r => r ? r.trim() : ''))].filter(Boolean);
      const groups = uniqueRoles.map(role => role.replace(/\s+/g, '_'));
      if (!groups.includes('Everyone')) groups.unshift('Everyone');
      
      options = [...groups, ...people];
    } else if (popupType === 'document') {
      options = documentsList.map(doc => doc.replace(/\s+/g, '_'));
    }
    
    if (!popupSearch) return options;
    return options.filter(opt => opt.toLowerCase().includes(popupSearch));
  };

  const handleOptionSelect = (option) => {
    let newValue = newMessage;
    if (popupType === 'mention') {
      newValue = newMessage.replace(/@[a-zA-Z0-9_]*$/, `@${option} `);
    } else if (popupType === 'document') {
      newValue = newMessage.replace(/#[a-zA-Z0-9_]*$/, `#${option} `);
    }
    setNewMessage(newValue);
    setPopupType(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setPopupType(null);
    }
  };

  const handleDocumentClick = (tagStr) => {
    const searchTag = tagStr.substring(1).toLowerCase(); // remove '#'
    const foundDoc = documentsData.find(d => {
       const t = d.title || d.name;
       if (!t) return false;
       return t.replace(/\s+/g, '_').toLowerCase() === searchTag;
    });
    
    if (foundDoc && foundDoc.url) {
      const url = foundDoc.url.startsWith('http') ? foundDoc.url : `https://${foundDoc.url}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert("Document link not found!");
    }
  };

  const handleReplyClick = (replyId) => {
    if (!replyId) return;
    const element = document.getElementById(`message-${replyId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => {
        if (element) element.classList.remove('highlight-message');
      }, 2000);
    }
  };

  const formatMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} style={{ color: '#3b82f6', fontWeight: '600', cursor: 'pointer' }}>{part}</span>;
      }
      if (part.startsWith('#')) {
        return <span key={i} onClick={() => handleDocumentClick(part)} style={{ color: '#10b981', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>{part}</span>;
      }
      return part;
    });
  };

  const formatDateGroup = (timestamp) => {
    if (!timestamp) return 'Today';
    const date = timestamp.toDate ? timestamp.toDate() : new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setActiveMessageMenu(null);
  };

  const handleEditInit = (msg) => {
    setEditingMessageId(msg.id);
    setEditMessageText(msg.text);
    setActiveMessageMenu(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editMessageText.trim()) return;
    try {
      await updateDoc(doc(db, 'chats', editingMessageId), {
        text: editMessageText.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditMessageText('');
    } catch (err) {
      console.error(err);
      alert("Failed to edit message");
    }
  };

  const handleReaction = async (msgId, currentReactions, emoji) => {
    const newReactions = { ...currentReactions };
    if (newReactions[currentUserId] === emoji) {
      delete newReactions[currentUserId]; // toggle off
    } else {
      newReactions[currentUserId] = emoji;
    }
    try {
      await updateDoc(doc(db, 'chats', msgId), {
        reactions: newReactions
      });
      setActiveReactionMenu(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in flex" style={{ flexDirection: 'column', height: '100%' }}>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}


      <div className="glass-panel chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30, 41, 59, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>Team Chat</h3>

            </div>
          </div>
          <div>
            <button 
              onClick={() => setIsVideoCallOpen(true)}
              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
            >
              <Video size={18} /> Join Call
              {activeCallParticipants.length > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', marginLeft: '4px' }}>
                  {activeCallParticipants.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeCallParticipants.length > 0 && !isVideoCallOpen && (
          <div style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.2))', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></div>
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '500' }}>
              Active video call: {activeCallParticipants.join(', ')}
            </span>
          </div>
        )}

        <div className="whatsapp-history">
          {loading ? (
            <div className="text-muted text-center mt-4">Loading messages...</div>
          ) : messages.length > 0 ? (
            (() => {
              let lastDateGroup = null;
              return messages.map((msg, index) => {
                const currentDateGroup = formatDateGroup(msg.createdAt);
                const showDateDivider = currentDateGroup !== lastDateGroup;
                lastDateGroup = currentDateGroup;
                
                const isMine = msg.sender === currentUser;
                const seenByOther = (msg.seenBy || []).some(id => id !== currentUserId && id !== msg.senderId);
                const userRole = membersMap[msg.sender] || msg.senderDesignation || (msg.sender === 'Master Admin' ? 'Project Lead' : 'Full Stack Developer');
                
                return (
                  <React.Fragment key={msg.id || index}>
                    {showDateDivider && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                        <span style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '6px 14px', borderRadius: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: '500', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                          {currentDateGroup}
                        </span>
                      </div>
                    )}
                    <div 
                      id={`message-${msg.id}`}
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
                        <div 
                          className="quote-box"
                          onClick={() => handleReplyClick(msg.replyTo.id)}
                          style={{ cursor: msg.replyTo.id ? 'pointer' : 'default' }}
                        >
                          <strong className="quote-sender">
                            {msg.replyTo.sender}
                          </strong>
                          {msg.replyTo.text.length > 55 ? msg.replyTo.text.substring(0, 55) + '...' : msg.replyTo.text}
                        </div>
                      )}
                      
                      <div className="bubble-text-flex">
                        {editingMessageId === msg.id ? (
                          <form onSubmit={handleEditSubmit} style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={editMessageText} 
                              onChange={e => setEditMessageText(e.target.value)} 
                              style={{ flex: 1, padding: '4px 8px', fontSize: '14px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                              autoFocus
                            />
                            <button type="submit" style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer' }}>
                              <Check size={18} />
                            </button>
                            <button type="button" onClick={() => setEditingMessageId(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                              <X size={18} />
                            </button>
                          </form>
                        ) : msg.type === 'audio' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', padding: '4px 0' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                              <Mic size={20} />
                            </div>
                            <audio controls src={msg.audioUrl} style={{ height: '32px', flex: 1, minWidth: '150px' }} className="custom-audio" />
                          </div>
                        ) : (
                          <span className="bubble-text">{formatMessageText(msg.text)}</span>
                        )}
    
                            <div className="bubble-meta">
                              {msg.isEdited && <span style={{ fontSize: '10px', fontStyle: 'italic', marginRight: '4px', opacity: 0.7 }}>Edited</span>}
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

                      {/* Reactions Render */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {Object.entries(
                            Object.values(msg.reactions).reduce((acc, emoji) => {
                              acc[emoji] = (acc[emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <span key={emoji} style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {emoji} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>{count}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="bubble-actions-inside" style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: '8px', 
                        marginTop: '6px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        paddingTop: '6px',
                        position: 'relative'
                      }}>
                        <button 
                          onClick={() => {
                            setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id);
                            setActiveMessageMenu(null);
                          }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '2px' }}
                          title="React"
                        >
                          <Smile size={14} />
                        </button>

                        <button 
                          onClick={() => handleCopy(msg.text)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '2px' }}
                          title="Copy Message"
                        >
                          <Copy size={14} />
                        </button>

                        {isMine && (
                          <button 
                            onClick={() => handleEditInit(msg)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '2px' }}
                            title="Edit Message"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {isMasterAdmin && (
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Delete Message"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <button 
                          onClick={() => setReplyingTo(msg)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '2px' }}
                          title="Reply"
                        >
                          <Reply size={14} />
                        </button>

                        <button 
                          onClick={() => {
                            setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                            setActiveReactionMenu(null);
                          }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '2px' }}
                          title="Info & Options"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {activeReactionMenu === msg.id && (
                          <div className="reaction-popup animate-fade-in" style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: isMine ? '30px' : 'auto',
                            left: isMine ? 'auto' : '30px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '20px',
                            padding: '6px 12px',
                            zIndex: 20,
                            display: 'flex',
                            gap: '8px',
                            boxShadow: '0 -4px 12px rgba(0,0,0,0.5)',
                            marginBottom: '8px'
                          }}>
                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                              <button 
                                key={emoji}
                                onClick={() => handleReaction(msg.id, msg.reactions || {}, emoji)}
                                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px', transition: 'transform 0.1s' }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {activeMessageMenu === msg.id && (
                          <div className="message-info-popup animate-fade-in" style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: isMine ? '0' : 'auto',
                            left: isMine ? 'auto' : '0',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '12px',
                            zIndex: 20,
                            minWidth: '160px',
                            boxShadow: '0 -4px 12px rgba(0,0,0,0.5)',
                            marginBottom: '8px',
                            textAlign: 'left'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                              <Eye size={14} color="#38bdf8" />
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#f8fafc' }}>Seen By</span>
                            </div>
                            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                              {(msg.seenBy || []).filter(id => id !== msg.senderId && idToNameMap[id]).length > 0 ? (
                                (msg.seenBy || []).filter(id => id !== msg.senderId && idToNameMap[id]).map((viewerId, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: '#cbd5e1', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={12} />
                                    {idToNameMap[viewerId]}
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>No one yet</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
              })
            })()
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

        <form onSubmit={handleSendMessage} className="chat-input-area" style={{ position: 'relative' }}>
          {popupType && (
            <div className="mention-popup" style={{
              position: 'absolute', bottom: '100%', left: '0', width: '100%', 
              maxHeight: '150px', overflowY: 'auto', background: '#1e293b', 
              borderRadius: '8px', padding: '8px', zIndex: 10, border: '1px solid #334155', marginBottom: '8px', boxShadow: '0 -4px 10px rgba(0,0,0,0.3)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase' }}>
                {popupType === 'mention' ? 'Tag Person' : 'Tag Document'}
              </div>
              {getFilteredOptions().length > 0 ? (
                getFilteredOptions().map((opt, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleOptionSelect(opt)}
                    style={{ padding: '8px', cursor: 'pointer', borderRadius: '4px', color: '#f8fafc', fontSize: '13px' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {popupType === 'mention' ? '@' : '#'}{opt}
                  </div>
                ))
              ) : (
                <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No results found</div>
              )}
            </div>
          )}
          {isRecording ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></div>
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                  {formatRecordingTime(recordingDuration)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => stopRecording(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} />
                </button>
                <button type="button" onClick={() => stopRecording(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                  <Square size={18} fill="currentColor" />
                </button>
              </div>
            </div>
          ) : recordedVoiceBlob ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <audio controls src={URL.createObjectURL(recordedVoiceBlob)} style={{ height: '36px', flex: 1 }} className="custom-audio" />
            </div>
          ) : (
            <input 
              type="text" 
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message, @mention, #doc..."
              className="chat-input"
            />
          )}

          {!isRecording && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {recordedVoiceBlob ? (
                <>
                  <button type="button" onClick={cancelRecordedVoice} className="btn-icon text-muted" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '10px', borderRadius: '50%', color: '#ef4444' }}>
                    <Trash2 size={20} />
                  </button>
                  <button type="button" onClick={sendRecordedVoice} className="btn-primary btn-icon">
                    <Send size={18} />
                  </button>
                </>
              ) : (
                <>
                  {newMessage.trim() === '' && (
                    <button type="button" onClick={startRecording} className="btn-icon text-muted" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '50%', color: '#38bdf8' }}>
                      <Mic size={20} />
                    </button>
                  )}
                  {(newMessage.trim() !== '' || popupType !== null) && (
                    <button type="submit" className="btn-primary btn-icon" disabled={!newMessage.trim()}>
                      <Send size={18} />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </form>

        {isVideoCallOpen && (
          <VideoCall 
            roomName="main_room" 
            user={{ name: currentUser }} 
            onLeave={() => setIsVideoCallOpen(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default Chat;

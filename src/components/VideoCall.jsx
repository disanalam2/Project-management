import React, { useRef, useEffect } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const VideoCall = ({ roomName, user, onClose }) => {
  const containerRef = useRef(null);
  const zpRef = useRef(null);
  const userName = user?.name || 'Guest';
  
  // Store latest onClose in a ref so we don't need it in useEffect dependencies
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current) return;

    const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
    const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;
    
    if (!appID || !serverSecret) {
      alert("ZegoCloud keys are missing! Please add VITE_ZEGO_APP_ID and VITE_ZEGO_SERVER_SECRET to your .env file.");
      onCloseRef.current();
      return;
    }

    // Generate ZegoCloud token with a unique ID for this session
    const userID = `user_${Date.now()}`;
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID, 
      serverSecret, 
      roomName, 
      userID,
      userName
    );
    
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;

    // Add to Firebase active call
    const callDocRef = doc(db, 'active_calls', roomName);
    setDoc(callDocRef, { participants: arrayUnion(userName) }, { merge: true }).catch(() => {});
    
    zp.joinRoom({
      container: containerRef.current,
      scenario: {
        mode: ZegoUIKitPrebuilt.VideoConference, 
      },
      showPreJoinView: true, 
      showScreenSharingButton: true,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showTextChat: true,
      showUserList: true,
      showLeaveRoomConfirmDialog: false,
      onLeaveRoom: () => {
        // Remove from Firebase when leaving the room explicitly
        setDoc(callDocRef, { participants: arrayRemove(userName) }, { merge: true }).catch(() => {});
        onCloseRef.current();
      }
    });

    return () => {
      // Remove from Firebase if component unmounts unexpectedly
      setDoc(callDocRef, { participants: arrayRemove(userName) }, { merge: true }).catch(() => {});
      if (zpRef.current) {
        try {
          zpRef.current.destroy();
        } catch (e) {
          console.error("Error destroying Zego instance:", e);
        }
      }
    };
  }, [roomName, userName]); // Omitting onCloseRef to prevent re-initialization loops

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#1c1f2e' }}>
      <div style={{ width: '100%', height: '100%' }} ref={containerRef}></div>
    </div>
  );
};

export default VideoCall;

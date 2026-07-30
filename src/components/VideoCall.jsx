import React, { useRef, useEffect } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const VideoCall = ({ roomName, user, onClose }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
    const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;
    
    if (!appID || !serverSecret) {
      alert("ZegoCloud keys are missing! Please add VITE_ZEGO_APP_ID and VITE_ZEGO_SERVER_SECRET to your .env file.");
      onClose();
      return;
    }

    // Add to Firebase active call
    const callDocRef = doc(db, 'active_calls', roomName);
    setDoc(callDocRef, { participants: arrayUnion(user.name) }, { merge: true }).catch(() => {});

    // Generate ZegoCloud token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID, 
      serverSecret, 
      roomName, 
      Date.now().toString(), // Generate a unique user ID for this session
      user.name || 'Guest'
    );
    
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    
    zp.joinRoom({
      container: containerRef.current,
      scenario: {
        mode: ZegoUIKitPrebuilt.VideoConference, 
      },
      showScreenSharingButton: true,
      onLeaveRoom: () => {
        // Remove from Firebase when leaving the room explicitly
        setDoc(callDocRef, { participants: arrayRemove(user.name) }, { merge: true }).catch(() => {});
        onClose();
      }
    });

    return () => {
      // Remove from Firebase if component unmounts unexpectedly
      setDoc(callDocRef, { participants: arrayRemove(user.name) }, { merge: true }).catch(() => {});
      if(zp) zp.destroy();
    };
  }, [roomName, user.name, onClose]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#1c1f2e' }}>
      <div style={{ width: '100vw', height: '100vh' }} ref={containerRef}></div>
    </div>
  );
};

export default VideoCall;

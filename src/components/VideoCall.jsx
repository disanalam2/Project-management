import React, { useRef, useEffect } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const VideoCall = ({ roomName, user, onClose }) => {
  const zpRef = useRef(null);
  const initialized = useRef(false);
  const userID = useRef(`user_${Date.now()}`).current;
  const userName = user?.name || 'Guest';

  const myMeeting = async (element) => {
    if (!element || initialized.current) return;
    initialized.current = true;

    const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
    const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;
    
    if (!appID || !serverSecret) {
      alert("ZegoCloud keys are missing! Please add VITE_ZEGO_APP_ID and VITE_ZEGO_SERVER_SECRET to your .env file.");
      onClose();
      return;
    }

    // Add to Firebase active call
    const callDocRef = doc(db, 'active_calls', roomName);
    setDoc(callDocRef, { participants: arrayUnion(userName) }, { merge: true }).catch(() => {});

    // Generate ZegoCloud token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID, 
      serverSecret, 
      roomName, 
      userID,
      userName
    );
    
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;
    
    zp.joinRoom({
      container: element,
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
        onClose();
      }
    });
  };

  useEffect(() => {
    return () => {
      // Remove from Firebase if component unmounts unexpectedly
      const callDocRef = doc(db, 'active_calls', roomName);
      setDoc(callDocRef, { participants: arrayRemove(userName) }, { merge: true }).catch(() => {});
      if (zpRef.current) {
        try {
          zpRef.current.destroy();
        } catch (e) {
          console.error("Error destroying Zego instance:", e);
        }
      }
    };
  }, [roomName, userName]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#1c1f2e' }}>
      <div style={{ width: '100%', height: '100%' }} ref={myMeeting}></div>
    </div>
  );
};

export default VideoCall;

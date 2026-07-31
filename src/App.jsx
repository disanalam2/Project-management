import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Documents from './components/Documents';
import Chat from './components/Chat';
import Members from './components/Members';
import DeveloperHandoffs from './components/DeveloperHandoffs';
import SchemasAndFeatures from './components/SchemasAndFeatures';
import WorkDistribution from './components/WorkDistribution';
// Create Auth Context
export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

let isOneSignalInitialized = false;

function App() {
  useEffect(() => {
    const initOneSignal = async () => {
      if (isOneSignalInitialized) return;
      
      try {
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: 'sw.js',
          notifyButton: {
            enable: true,
            text: {
              'tip.state.unsubscribed': 'Allow notifications',
              'message.prenotify': 'Click to allow notifications',
              'dialog.main.button.subscribe': 'ALLOW NOTIFICATIONS',
              'dialog.main.button.unsubscribe': 'TURN OFF NOTIFICATIONS'
            }
          },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: true,
                  text: {
                    actionMessage: "We'd like to send you notifications for new chat messages and documents.",
                    acceptButton: "Allow Notifications",
                    cancelButton: "Later"
                  }
                }
              ]
            }
          }
        });
        
        isOneSignalInitialized = true;
        
        // Sync tags for logged-in user on load
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
           const parsedUser = JSON.parse(savedUser);
           const userName = parsedUser.name.replace(/\s+/g, '_');
           const userRole = (parsedUser.designation || parsedUser.role || 'member').replace(/\s+/g, '_');
           OneSignal.login(userName).catch(e => {});
           OneSignal.User.addTag("name", userName);
           OneSignal.User.addTag("role", userRole);
        }
        
        // Force the prompt to show on every refresh ONLY if they haven't allowed yet
        if (window.Notification && Notification.permission !== 'granted') {
          OneSignal.Slidedown.promptPush({ force: true });
        }
        
      } catch (error) {
        if (error.message && error.message.includes("SDK already initialized")) {
          isOneSignalInitialized = true;
        } else if (error.message && error.message.includes("Can only be used on")) {
          console.warn("OneSignal notifications are disabled on localhost because your OneSignal dashboard is locked to https://gdg-project-hub.web.app");
        } else {
          console.error("OneSignal initialization failed", error);
        }
      }
    };
    initOneSignal();
  }, []);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isAuthenticated = !!user;

  // We don't implement the async logic here in App.jsx to keep it clean.
  // Instead, we just pass an auth setter and do the logic in Login.jsx.
  // This avoids circular dependencies and complex imports here.

  const setAuthUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (isOneSignalInitialized) {
       const userName = userData.name.replace(/\s+/g, '_');
       const userRole = (userData.designation || userData.role || 'member').replace(/\s+/g, '_');
       OneSignal.login(userName).catch(e => {});
       OneSignal.User.addTag("name", userName);
       OneSignal.User.addTag("role", userRole);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    if (isOneSignalInitialized) {
       OneSignal.logout().catch(e => {});
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, setAuthUser, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/documents" replace />} />
            <Route path="documents" element={<Documents />} />
            <Route path="chat" element={<Chat />} />
            <Route path="members" element={<Members />} />
            <Route path="developer-handoffs" element={<DeveloperHandoffs />} />
            <Route path="schemas" element={<SchemasAndFeatures />} />
            <Route path="work-distribution" element={<WorkDistribution />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;

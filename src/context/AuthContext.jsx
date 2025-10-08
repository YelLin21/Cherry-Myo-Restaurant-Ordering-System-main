// AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";   // <- your firebase.js file

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authInitializing, setAuthInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitializing(false);   // ✅ finished restoring session
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, authInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

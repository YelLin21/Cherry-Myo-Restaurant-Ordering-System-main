import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkI1CkJXhxbVs6vhydrCPB209SuHfSAVs",
  authDomain: "cherry-myo.firebaseapp.com",
  projectId: "cherry-myo",
  storageBucket: "cherry-myo.firebasestorage.app",
  messagingSenderId: "413727183572",
  appId: "1:413727183572:web:a9e50e2b41a7845a06e141",
  measurementId: "G-06NCCXQH9G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

// Set auth persistence to local storage with better error handling
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

const signInWithGoogle = async () => {
  try {
    // Add timeout to prevent hanging promises
    const result = await Promise.race([
      signInWithPopup(auth, provider),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), 30000)
      )
    ]);
    
    console.log("User signed in:", result.user);
    return result;
  } catch (error) {
    console.error("Sign-in error:", error);
    
    // Handle specific error cases
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site.');
    } else if (error.message === 'Authentication timeout') {
      throw new Error('Authentication timed out. Please try again.');
    }
    
    throw error;
  }
};

export { db, auth, signInWithGoogle };

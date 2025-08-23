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

// Set auth persistence to local storage
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

const signInWithGoogle = () => {
  return signInWithPopup(auth, provider)
    .then((result) => {
      console.log("User signed in:", result.user);
      return result;
    })
    .catch((error) => {
      console.error("Sign-in error:", error);
      throw error;
    });
};

export { db, auth, signInWithGoogle };

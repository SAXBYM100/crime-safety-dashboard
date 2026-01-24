import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDdAree9lefLzpU13U5efFjSey8ogHdo6c",
  authDomain: "area-iq.firebaseapp.com",
  projectId: "area-iq",
  storageBucket: "area-iq.firebasestorage.app",
  messagingSenderId: "390435525638",
  appId: "1:390435525638:web:a89d14a09d49aa8deb1f87",
  measurementId: "G-8Z55W6P9HV"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Core services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics (only runs in browser, not SSR / Vercel build)
export let analytics = null;
isSupported().then((yes) => {
  if (yes) {
    analytics = getAnalytics(app);
  }
});

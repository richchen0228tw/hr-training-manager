import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: 請在 .env 或 .env.local 檔案中填入您的 Firebase 設定
// 如果您還沒有 Firebase 專案，請至 https://console.firebase.google.com/ 建立
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log("Firebase Config Loaded:", {
    apiKey: firebaseConfig.apiKey ? "Present" : "Missing",
    projectId: firebaseConfig.projectId ? "Present" : "Missing",
    fullConfig: firebaseConfig
});

// Initialize Firebase
let app;
let db: any; // Use any to allow fallback mock or null
let isFirebaseInitialized = false;

try {
    // Basic validation: Check if required keys are present
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Missing Firebase configuration keys");
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
} catch (e) {
    console.warn("⚠️ Firebase Initialization Failed or Config Missing. Falling back to Local Mode. Error:", e);
    // Provide a dummy db object to prevent immediate crashes, 
    // but app logic should check isFirebaseInitialized
    db = null;
}

export { db, isFirebaseInitialized };

const admin = require('firebase-admin');
require('dotenv').config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Force replace literal "\n" strings with actual line breaks
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Strip any accidental surrounding quotes that dotenv might have left behind
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }
}

console.log("--- AUTH DIAGNOSTICS ---");
console.log("1. Email:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("2. Key Starts With:", privateKey ? privateKey.substring(0, 30) : "MISSING");
console.log("3. Key Ends With:", privateKey ? privateKey.slice(-30) : "MISSING");
console.log("------------------------");

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
  console.log('Firebase Admin initialized successfully.');
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  process.exit(1); // Hard exit — app is useless without Firebase
}

const db        = admin.firestore();
const auth      = admin.auth();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue; // NEW — use for serverTimestamp()

module.exports = { admin, db, auth, messaging, FieldValue };

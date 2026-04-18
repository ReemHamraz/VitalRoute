const admin = require('firebase-admin');
require('dotenv').config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

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

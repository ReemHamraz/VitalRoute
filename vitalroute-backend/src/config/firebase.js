require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

// 1. THE SLEDGEHAMMER: Calculate the exact C:\Users\... path to your file
// Adjust '../../serviceAccountKey.json' depending on where this file is relative to the root
const absoluteKeyPath = path.resolve(__dirname, '../../serviceAccountKey.json');

// 2. Force the underlying Google gRPC network layer to use this exact file
process.env.GOOGLE_APPLICATION_CREDENTIALS = absoluteKeyPath;

try {
  if (!admin.apps.length) {
    const serviceAccount = require(absoluteKeyPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log(`🔥 Firebase Admin connected via ABSOLUTE PATH: \n   ${absoluteKeyPath}`);
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// THE GRPC BYPASS: Force Firebase to use standard HTTP instead of gRPC
// This prevents Antivirus and Firewalls from stripping the auth token!
db.settings({ preferRest: true });

const auth       = admin.auth();
const messaging  = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

module.exports = { admin, db, auth, messaging, FieldValue };

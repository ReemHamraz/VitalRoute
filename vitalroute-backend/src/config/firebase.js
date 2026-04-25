require('dotenv').config();
const admin = require('firebase-admin');

let serviceAccount;

try {
  // ☁️ CLOUD MODE: If deployed, read the secret from the Environment Variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // 💻 LOCAL MODE: Clean, relative path. Node handles the parsing automatically.
    serviceAccount = require('../../serviceAccountKey.json');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('🔥 Firebase Admin connected securely.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// THE GRPC BYPASS: This is the most important line. 
// It forces standard HTTP/REST which bypasses the Windows Antivirus/Firewall issues.
db.settings({ preferRest: true });

const auth       = admin.auth();
const messaging  = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

module.exports = { admin, db, auth, messaging, FieldValue };
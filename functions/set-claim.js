// One-time bootstrap: grant a custom claim to an existing Firebase Auth user.
//   cd functions && npm install
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node set-claim.js you@example.com admin
// Roles: admin | staff | none. The user must sign out and back in to receive the new claim.
const admin = require("firebase-admin");

const [email, role] = process.argv.slice(2);
const claimsByRole = { admin: { admin: true }, staff: { staff: true }, none: {} };
if (!email || !claimsByRole[role]) {
  console.error("Usage: node set-claim.js <email> <admin|staff|none>");
  process.exit(1);
}

admin.initializeApp();
admin.auth().getUserByEmail(email)
  .then((user) => admin.auth().setCustomUserClaims(user.uid, claimsByRole[role]).then(() => user))
  .then((user) => { console.log(`OK: ${email} (${user.uid}) -> ${role}`); process.exit(0); })
  .catch((err) => { console.error("Failed:", err.message); process.exit(1); });

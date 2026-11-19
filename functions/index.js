const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteAuthUser = onValueWritten(
  {
    ref: "/users/{uid}",
  },
  async (event) => {
    const uid = event.params.uid;
    const before = event.data.before.val();
    const after = event.data.after.val();

    if (before !== null && after === null) {
      try {
        await admin.auth().deleteUser(uid);
        console.log("Deleted auth user:", uid);
      } catch (err) {
        console.error("Failed to delete auth user:", uid, err.message);
      }
    }
  }
);

// Admin-only: grant or revoke the "admin"/"staff" custom claims used by the admin panel and DB rules.
exports.setUserClaims = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const header = req.get("Authorization") || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  let caller;
  try {
    caller = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
  if (caller.admin !== true) {
    return res.status(403).json({ ok: false, error: "Admins only" });
  }

  const { email, role } = req.body || {};
  const claimsByRole = { admin: { admin: true }, staff: { staff: true }, none: {} };
  if (typeof email !== "string" || !email.includes("@") || !Object.prototype.hasOwnProperty.call(claimsByRole, role)) {
    return res.status(400).json({ ok: false, error: "Expected { email, role: admin | staff | none }" });
  }
  if (email.toLowerCase() === String(caller.email || "").toLowerCase() && role !== "admin") {
    return res.status(400).json({ ok: false, error: "You cannot remove your own admin access" });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, claimsByRole[role]);
    return res.json({ ok: true, uid: user.uid, role });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message || "User not found" });
  }
});

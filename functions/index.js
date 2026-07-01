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

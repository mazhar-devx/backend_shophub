const User = require("../models/userModel");

const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = "password123";

/** Create or update default admin when server starts. No need to run createAdminUser.js separately. */
async function ensureAdmin() {
  try {
    let admin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
    if (admin) {
      if (admin.role !== "admin") {
        admin.role = "admin";
        await admin.save({ validateBeforeSave: false });
      }
      console.log("Admin user ready:", DEFAULT_ADMIN_EMAIL);
    } else {
      await User.create({
        name: "Super Admin",
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        passwordConfirm: DEFAULT_ADMIN_PASSWORD,
        role: "admin",
      });
      console.log("Admin created. Login:", DEFAULT_ADMIN_EMAIL, "/", DEFAULT_ADMIN_PASSWORD);
    }
  } catch (err) {
    console.warn("Could not ensure admin user:", err.message);
  }
}

module.exports = { ensureAdmin, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD };

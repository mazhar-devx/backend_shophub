const User = require("../models/userModel");
const Product = require("../models/productModel");
const Video = require("../models/videoModel");

const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = "password123";

/** Create or update default admin when server starts. No need to run createAdminUser.js separately. */
async function ensureAdmin() {
  try {
    let admin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
    
    // Resolve duplicate vendorName: 'mazhar.devx' if it belongs to another user
    const duplicate = await User.findOne({ 
      vendorName: 'mazhar.devx', 
      email: { $ne: DEFAULT_ADMIN_EMAIL } 
    });

    if (admin) {
      if (duplicate) {
        console.log(`[ensureAdmin] Resolving duplicate vendorName: 'mazhar.devx' from user ${duplicate.email}...`);
        
        // Merge products and videos
        const pResult = await Product.updateMany({ vendor: duplicate._id }, { vendor: admin._id });
        const vResult = await Video.updateMany({ user: duplicate._id }, { user: admin._id });
        console.log(`[ensureAdmin] Merged ${pResult.modifiedCount || 0} products and ${vResult.modifiedCount || 0} videos to main admin.`);
        
        // Delete duplicate user
        await User.deleteOne({ _id: duplicate._id });
        console.log(`[ensureAdmin] Deleted duplicate sub-admin.`);
      }

      // Update main admin
      if (admin.role !== "admin" || !admin.isVerified || admin.vendorName !== "mazhar.devx") {
        admin.role = "admin";
        admin.isVerified = true;
        admin.vendorName = "mazhar.devx";
        await admin.save({ validateBeforeSave: false });
        console.log("Admin updated with vendorName: 'mazhar.devx'");
      }
      console.log("Admin user ready:", DEFAULT_ADMIN_EMAIL);
    } else {
      if (duplicate) {
        console.log(`[ensureAdmin] Duplicate admin found but main admin does not exist. Promoting duplicate to main email...`);
        duplicate.email = DEFAULT_ADMIN_EMAIL;
        duplicate.role = "admin";
        duplicate.isVerified = true;
        await duplicate.save({ validateBeforeSave: false });
        console.log("Promoted duplicate to main admin.");
      } else {
        await User.create({
          name: "Super Admin",
          email: DEFAULT_ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
          passwordConfirm: DEFAULT_ADMIN_PASSWORD,
          role: "admin",
          vendorName: "mazhar.devx",
          isVerified: true,
        });
        console.log("Admin created. Login:", DEFAULT_ADMIN_EMAIL, "/", DEFAULT_ADMIN_PASSWORD);
      }
    }
  } catch (err) {
    console.warn("Could not ensure admin user:", err.message);
  }
}

module.exports = { ensureAdmin, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD };

# Goal Description

The objective is to allow multiple admins to share the same login credentials (email and password) while maintaining isolated data (products, orders, reviews, etc.). This will be achieved by asking the admin for a "Unique Name or Number" after they log in. This unique identifier will be used to tag their products and filter their views, instead of using their database User ID. Additionally, a secret input will be added to the dashboard to allow the "real admin" to type `mazhar.devx` and instantly gain Super Admin access to see all data across all vendors.

## User Review Required

> [!IMPORTANT]
> Because multiple admins are sharing the same account, we cannot store the "Unique Name" in the database user profile, otherwise one admin would overwrite another's name. 
> 
> **My Proposed Solution:** We will store the "Unique Name" locally in their browser (LocalStorage) and send it with every request as a custom header (`X-Vendor-Identifier`). The database models (like `Product`) will be updated to save this string identifier instead of the User ID. Does this approach sound good to you?

## Proposed Changes

---

### Backend (Models & Middleware)

#### [MODIFY] [productModel.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/models/productModel.js)
- Change the `vendor` field type from `ObjectId` to `String`. It will now store the unique name entered by the admin.

#### [MODIFY] [authController.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/controllers/authController.js)
- Update the `protect` middleware to read the `X-Vendor-Identifier` header and attach it to `req.vendorIdentifier`.

---

### Backend (Controllers - Vendor Isolation Update)

#### [MODIFY] [productController.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/controllers/productController.js)
- Update `getAllProducts`, `updateProduct`, `deleteProduct`, and `createProduct` to use `req.vendorIdentifier` instead of `req.user._id` for filtering and association.
- Super Admin check: `req.vendorIdentifier === 'mazhar.devx'`.

#### [MODIFY] [orderController.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/controllers/orderController.js)
- Update filtering logic to use `req.vendorIdentifier` to find the admin's products and filter order items accordingly.

#### [MODIFY] [dashboardController.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/controllers/dashboardController.js)
- Update statistics generation to filter based on `req.vendorIdentifier`.

#### [MODIFY] [reviewController.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/controllers/reviewController.js)
- Update review filtering to use `req.vendorIdentifier`.

#### [MODIFY] [userController.js](file:///c:/Users/mazhar/Desktop/shophub_/backend_shophub-main/controllers/userController.js)
- Update `getCustomersWithStats` to use `req.vendorIdentifier`.

---

### Frontend

#### [MODIFY] [api.js](file:///c:/Users/mazhar/Desktop/shophub_/frontend_shophub-main/src/services/api.js)
- Add an axios interceptor to append the `X-Vendor-Identifier` header to every outgoing request by reading it from `localStorage`.

#### [MODIFY] [VendorNamePrompt.jsx](file:///c:/Users/mazhar/Desktop/shophub_/frontend_shophub-main/src/components/VendorNamePrompt.jsx)
- Update this component to ask for the unique name *every time* an admin logs in (if it's not already set in their current browser session).
- Instead of making an API call to save it to the database, save it directly to `localStorage` and close the prompt.

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/mazhar/Desktop/shophub_/frontend_shophub-main/src/pages/admin/Dashboard.jsx)
- Add a subtle, small input field specifically for the Super Admin.
- When `mazhar.devx` is typed into this input, immediately update `localStorage` and trigger a data refresh to reveal all platform data.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. Login as admin using the shared credentials.
2. Enter a unique name like `Vendor A` in the prompt. Create a product.
3. Open an Incognito window, login with the same credentials, enter `Vendor B`.
4. Verify `Vendor B` cannot see `Vendor A`'s products.
5. On the dashboard, type `mazhar.devx` into the secret input.
6. Verify all products from both `Vendor A` and `Vendor B` are now visible.

# 🔧 AUTHENTICATION DEBUG & TEST GUIDE

## 🚨 CRITICAL: Follow These Steps EXACTLY

### Step 1: Restart Backend Server

```bash
cd backend
node server.js
```

**Expected Output**:
```
✅ MongoDB Connected Successfully
🚀 Server running on http://localhost:5000
```

---

### Step 2: Clear Old Data (IMPORTANT!)

**Option A: Delete user from MongoDB**
- Open MongoDB Compass or Atlas
- Find your database → users collection
- Delete ALL existing users

**Option B: Use a NEW email**
- Don't reuse emails from previous tests
- Use: `newtest@example.com`

---

### Step 3: Test Signup

1. Go to: http://localhost:5173/signup
2. Fill in:
   - **Name**: Test User
   - **Phone**: 1234567890
   - **Email**: `newtest@example.com` (LOWERCASE!)
   - **Password**: `password123` (remember this EXACTLY)
   - **Role**: Passenger
3. Click "Sign Up"

**Backend Logs to Check**:
```
📝 SIGNUP REQUEST RECEIVED
Name: Test User
Email: newtest@example.com
...
🔒 Hashing password...
✅ Password hashed successfully
Hash length: 60
✅ User created successfully
```

**Frontend**:
- Alert: "Account created successfully! Please login."
- Redirected to login page

---

### Step 4: Test Login (THE CRITICAL TEST)

1. On login page
2. Enter:
   - **Email**: `newtest@example.com` (EXACT same as signup)
   - **Password**: `password123` (EXACT same as signup)
3. Click "Login"

**Backend Logs to Check** (VERY IMPORTANT):
```
🔐 ========== LOGIN REQUEST ==========
Request body: { email: 'newtest@example.com', password: 'password123' }
Email received: newtest@example.com
Password received: YES (length: 11)
📧 Normalized email: newtest@example.com
👥 Total users in database: 1
🔍 Checking user 1: newtest@example.com
✅ USER FOUND!
User ID: ...
User name: Test User
User role: passenger
Stored password hash: $2a$10$...

🔑 COMPARING PASSWORDS...
Plain password: password123
Stored hash: $2a$10$...
🔑 Password match result: true
✅ PASSWORD MATCHED!
✅ JWT TOKEN GENERATED
✅ LOGIN SUCCESSFUL!
```

**Frontend Console Logs**:
```
🔐 Frontend Login Attempt
Email: newtest@example.com
Password length: 11
🔐 AuthContext login called
📡 API Request: POST /auth/login
✅ API Response: /auth/login 200
✅ Login successful!
User: { id: '...', name: 'Test User', role: 'passenger' }
→ Redirecting to /passenger
```

**Expected Result**:
- ✅ No errors
- ✅ Redirected to `/passenger` dashboard
- ✅ Dashboard shows "Welcome, Test User!"

---

### Step 5: If Login STILL Fails

**Check Backend Logs for**:

1. **"USER NOT FOUND"** → Email mismatch
   - Solution: Use EXACT same email (case-sensitive before normalization)
   - Delete user and signup again with lowercase email

2. **"PASSWORD MISMATCH"** → Password issue
   - Check: `Password match result: false`
   - Solution: Make sure you're using EXACT same password
   - Check if password has spaces or special characters

3. **"Password match result: true" but still error** → Response format issue
   - Check if response has `success: true`
   - Check if `token` exists in response

---

### Step 6: Check Browser Console

Open DevTools (F12) → Console tab

**Look for**:
- ✅ All green checkmarks
- ❌ Any red errors
- Network tab: Check `/auth/login` request/response

**Common Issues**:
- CORS error → Backend not running
- 404 error → Wrong API endpoint
- Network error → Backend crashed

---

### Step 7: Test Dashboard Data

After successful login to passenger dashboard:

**Check**:
- Wallet balance displays
- Trip history displays
- No console errors

**Backend should have these routes working**:
- `GET /api/passenger/wallet`
- `GET /api/passenger/trips`

---

## 🐛 Debugging Checklist

### If "Invalid Credentials" Error:

- [ ] Backend server is running
- [ ] Used EXACT same email for signup and login
- [ ] Used EXACT same password for signup and login
- [ ] Email is lowercase (or normalized)
- [ ] Password has no extra spaces
- [ ] User exists in MongoDB
- [ ] Backend logs show "USER FOUND"
- [ ] Backend logs show "Password match result: true"

### If Login Succeeds but No Redirect:

- [ ] Check frontend console for redirect logs
- [ ] Check user.role value
- [ ] Check navigate() is called
- [ ] Check App.jsx has correct routes

### If Dashboard Shows "Loading..." Forever:

- [ ] Check backend routes are registered
- [ ] Check token is in localStorage
- [ ] Check API calls in Network tab
- [ ] Check backend logs for API requests

---

## 📋 Complete Test Sequence

```
1. Delete old users from MongoDB
2. Restart backend server
3. Signup with: newtest@example.com / password123
4. Check backend logs: "User created successfully"
5. Login with: newtest@example.com / password123
6. Check backend logs: "LOGIN SUCCESSFUL"
7. Check frontend console: "Redirecting to /passenger"
8. Verify dashboard loads with user name
9. Check wallet and trips display
10. Test logout button
```

---

## 🔍 What the Logs Tell You

### Signup Logs:
- `📝 SIGNUP REQUEST RECEIVED` → Request reached backend
- `🔒 Hashing password...` → Password being hashed
- `Hash length: 60` → bcrypt hash created (should be ~60 chars)
- `✅ User created successfully` → Saved to MongoDB

### Login Logs:
- `🔐 LOGIN REQUEST` → Request reached backend
- `Email received: ...` → Email extracted from body
- `Password received: YES` → Password extracted from body
- `✅ USER FOUND!` → Email matched in database
- `Stored password hash: $2a$10$...` → Hash retrieved from DB
- `🔑 Password match result: true` → bcrypt.compare succeeded
- `✅ JWT TOKEN GENERATED` → Token created
- `✅ LOGIN SUCCESSFUL!` → Response sent

### Frontend Logs:
- `🔐 Frontend Login Attempt` → Form submitted
- `🔐 AuthContext login called` → Context function called
- `📡 API Request: POST /auth/login` → Axios request sent
- `✅ API Response: 200` → Success response received
- `→ Redirecting to /passenger` → Navigation triggered

---

## ⚠️ IMPORTANT NOTES

1. **Password Case Sensitivity**: Passwords ARE case-sensitive
   - `Password123` ≠ `password123`

2. **Email Normalization**: Emails are normalized to lowercase
   - `Test@Example.com` = `test@example.com`

3. **Token Storage**: Token must be in localStorage
   - Check: `localStorage.getItem("token")`

4. **CORS**: Backend must allow frontend origin
   - Check `cors()` middleware in server.js

5. **MongoDB**: User must exist with correct password hash
   - Hash should start with `$2a$10$` or `$2b$10$`

---

## 🎯 Success Criteria

✅ Signup creates user in MongoDB
✅ Backend logs show "User created successfully"
✅ Login backend logs show "LOGIN SUCCESSFUL"
✅ Frontend console shows "Redirecting to /passenger"
✅ Dashboard loads with user name
✅ Wallet balance displays
✅ Trip history displays
✅ No console errors
✅ Logout works

---

## 🆘 If Still Not Working

**Send me these logs**:

1. **Full backend login logs** (from "LOGIN REQUEST" to end)
2. **Frontend console logs** (all messages)
3. **Network tab**: Screenshot of `/auth/login` request/response
4. **MongoDB**: Screenshot of user document

This will help identify the EXACT issue!

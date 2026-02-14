# Tasks: Encryption/Decryption Safety Fix

## 1. Update Safe Decryption Function
**Status:** Not Started  
**Priority:** Critical  
**File:** `backend/utils/encryption.js`

Update the `decryptData()` function to handle decryption failures gracefully:

**Changes:**
1. Return original `cipher` value instead of `null` when decryption produces empty string
2. Return original `cipher` value in catch block instead of `null`
3. Change `console.error` to `console.log` with message "⚠️ Safe Decrypt Skip (Not Encrypted Yet)"

**Acceptance Criteria:**
- `decryptData(null)` returns `null`
- `decryptData(invalidCipher)` returns `invalidCipher` (original value)
- `decryptData(validCipher)` returns decrypted text
- No exceptions thrown for any input
- Console shows warnings, not errors

**Testing:**
- [ ] 1.1 Test with null input
- [ ] 1.2 Test with invalid cipher text
- [ ] 1.3 Test with valid encrypted data
- [ ] 1.4 Test with plaintext string
- [ ] 1.5 Verify no exceptions thrown

---

## 2. Add Safe Decryption Helper to Auth Routes
**Status:** Not Started  
**Priority:** Critical  
**File:** `backend/routes/auth.js`

Add a `safeDecrypt()` helper function at the top of the file (after imports):

```javascript
const safeDecrypt = (value) => {
    try {
        return decryptData(value);
    } catch (e) {
        console.log("⚠️ Field decryption failed, using fallback");
        return value;
    }
};
```

**Acceptance Criteria:**
- Helper function added after imports
- Function wraps `decryptData()` in try-catch
- Returns original value on error
- Logs warning message

**Testing:**
- [ ] 2.1 Verify function is defined
- [ ] 2.2 Test with valid encrypted value
- [ ] 2.3 Test with invalid value

---

## 3. Update Login Response Building
**Status:** Not Started  
**Priority:** Critical  
**File:** `backend/routes/auth.js`

Update the login endpoint response to use `safeDecrypt()` for email and phone fields.

**Current code location:** Around line 95-105 in the `/login` POST route

**Changes:**
Replace:
```javascript
email: decryptData(user.email),
phone: decryptData(user.phone),
```

With:
```javascript
email: safeDecrypt(user.email),
phone: safeDecrypt(user.phone),
```

**Acceptance Criteria:**
- Login response uses `safeDecrypt()` for email field
- Login response uses `safeDecrypt()` for phone field
- RFID decryption remains unchanged (already has try-catch)
- Login succeeds even if email/phone decryption fails

**Testing:**
- [ ] 3.1 Test login with valid encrypted user
- [ ] 3.2 Test login with user having invalid encrypted email
- [ ] 3.3 Test login with user having invalid encrypted phone
- [ ] 3.4 Verify JWT token is returned
- [ ] 3.5 Verify user data is in response

---

## 4. Update /me Endpoint Response Building
**Status:** Not Started  
**Priority:** High  
**File:** `backend/routes/auth.js`

Update the `/me` GET endpoint to use `safeDecrypt()` for email and phone fields.

**Current code location:** Around line 120-130 in the `/me` GET route

**Changes:**
Replace:
```javascript
email: decryptData(user.email),
phone: decryptData(user.phone),
```

With:
```javascript
email: safeDecrypt(user.email),
phone: safeDecrypt(user.phone),
```

**Acceptance Criteria:**
- /me response uses `safeDecrypt()` for email field
- /me response uses `safeDecrypt()` for phone field
- RFID decryption remains unchanged
- Endpoint returns 200 even if decryption fails

**Testing:**
- [ ] 4.1 Test /me with valid encrypted user
- [ ] 4.2 Test /me with user having invalid encrypted fields
- [ ] 4.3 Verify response contains user data
- [ ] 4.4 Verify no 500 errors

---

## 5. Verify RFID Controller (No Changes Needed)
**Status:** ✅ Completed  
**Priority:** Medium  
**File:** `backend/controllers/rfidController.js`

Verify that RFID operations are already safe and use hash-based lookups only.

**Verification Points:**
1. `scanRFID` uses `User.findOne({ rfid_uid_hash: hashedUid })`
2. No `decryptData()` calls during user lookup
3. `linkRFID` and `linkRFIDByScan` only encrypt, never decrypt

**Acceptance Criteria:**
- RFID scan uses hash field for lookup
- No decryption during scan process
- RFID link functions are safe

**Testing:**
- [x] 5.1 Test RFID scan with valid card
- [x] 5.2 Test RFID scan with unlinked card
- [x] 5.3 Test RFID link operation
- [x] 5.4 Verify no decryption errors in logs

---

## 6. Create Database Cleanup Documentation
**Status:** Not Started  
**Priority:** Low  
**File:** `backend/MONGODB_FIX.md` (update existing file)

Add instructions for cleaning the development database to remove users with broken encryption.

**Content to Add:**
```markdown
## Development Database Cleanup

If you encounter encryption errors, clean the database and re-register users:

### Method 1: MongoDB Shell
\`\`\`javascript
use smartbuspass
db.users.deleteMany({})
db.wallets.deleteMany({})
db.transactions.deleteMany({})
\`\`\`

### Method 2: MongoDB Compass
1. Connect to your local MongoDB
2. Select `smartbuspass` database
3. Delete all documents from `users`, `wallets`, and `transactions` collections

⚠️ **WARNING:** Only use in development! Never run in production!

After cleanup, restart the server and register fresh users.
```

**Acceptance Criteria:**
- Documentation added to MONGODB_FIX.md
- Clear warning about development-only usage
- Both MongoDB shell and Compass methods documented

---

## 7. Integration Testing
**Status:** Not Started  
**Priority:** Critical  
**Dependencies:** Tasks 1-4 must be completed

Perform end-to-end testing of the fixed system.

**Test Scenarios:**
1. Clean database
2. Register new conductor user
3. Login as conductor → should succeed
4. Register new passenger user
5. Login as passenger → should succeed
6. Link RFID card to passenger
7. Scan RFID card → should deduct fare
8. Check backend logs → no "Malformed UTF-8" errors

**Acceptance Criteria:**
- All login attempts succeed
- RFID operations work correctly
- No decryption errors in logs
- All endpoints return expected responses

**Testing:**
- [x] 7.1 Clean database
- [x] 7.2 Register and login conductor
- [x] 7.3 Register and login passenger
- [x] 7.4 Link RFID card
- [x] 7.5 Scan RFID card
- [x] 7.6 Verify no errors in logs
- [x] 7.7 Test /me endpoint for both users

---

## Summary

**Total Tasks:** 7  
**Critical Priority:** 4 tasks  
**High Priority:** 1 task  
**Medium Priority:** 1 task  
**Low Priority:** 1 task

**Estimated Time:** 2-3 hours

**Execution Order:**
1. Task 1 (Update decryptData)
2. Task 2 (Add safeDecrypt helper)
3. Task 3 (Update login response)
4. Task 4 (Update /me response)
5. Task 5 (Verify RFID controller)
6. Task 7 (Integration testing)
7. Task 6 (Documentation - can be done anytime)

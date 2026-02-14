# Design: Encryption/Decryption Safety Fix

## 1. Design Overview

This design implements a defensive encryption/decryption strategy that gracefully handles mixed data states (plaintext, valid encryption, invalid encryption) without crashing the application. The core principle is: **when decryption fails, return the original value and log a warning**.

### 1.1 Key Design Decisions

1. **Fallback Strategy**: `decryptData()` returns the original ciphertext on failure instead of `null` or throwing
2. **Hash-Only Lookups**: RFID operations use only hash fields, never decrypt during search
3. **Safe Response Building**: User response objects wrap decryption calls in try-catch
4. **Minimal Changes**: Fix only the critical paths without refactoring the entire codebase

## 2. Architecture Changes

### 2.1 Data Flow

#### Login Flow (Fixed)
```
1. Client sends email + password
2. Server fetches ALL users
3. For each user:
   a. Try to decrypt email
   b. If decryption fails → skip user (don't crash)
   c. If decryption succeeds → compare with input
4. If user found → verify password
5. Build response with safe decryption
6. Return JWT + user data
```

#### RFID Scan Flow (Fixed)
```
1. ESP32 sends UID
2. Server hashes UID
3. Lookup user by rfid_uid_hash (NO DECRYPTION)
4. If found → deduct fare
5. Return "SUCCESS" to ESP32
```

## 3. Detailed Design

### 3.1 Safe Decryption Function

**File:** `backend/utils/encryption.js`

**Current Implementation Issues:**
- Returns `null` when decryption produces empty string
- Logs errors that spam the console
- Doesn't handle the case where data is plaintext

**New Implementation:**

```javascript
const decryptData = (cipher) => {
  if (!cipher) return null;
  if (!AES_SECRET) throw new Error("AES_SECRET is not defined");
  
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, AES_SECRET);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decrypted is empty, treat as invalid encryption
    if (!originalText) {
      console.log("⚠️ Safe Decrypt Skip (Not Encrypted Yet)");
      return cipher;
    }
    
    return originalText;
  } catch (error) {
    console.log("⚠️ Safe Decrypt Skip (Not Encrypted Yet)");
    return cipher;
  }
};
```

**Key Changes:**
1. Return `cipher` (original value) instead of `null` when decryption fails
2. Change `console.error` to `console.log` with friendly message
3. Handle empty string case explicitly

### 3.2 Login Controller Safety

**File:** `backend/routes/auth.js`

**Current Issues:**
- Decrypts ALL user emails in a loop (crashes if any fail)
- Decrypts phone/email/RFID in response without error handling

**Changes Required:**

Add safe decryption helper:
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

Use in response building:
```javascript
user: {
    id: user._id,
    name: user.name,
    email: safeDecrypt(user.email),
    phone: safeDecrypt(user.phone),
    role: user.role,
    wallet_balance: user.wallet_balance,
    rfid_uid: decryptedRfid
}
```

### 3.3 RFID Controller Safety

**File:** `backend/controllers/rfidController.js`

**Analysis:** Already safe! Uses hash-based lookup only.

**No changes required.**

## 4. Implementation Plan

### 4.1 Files to Modify

1. **backend/utils/encryption.js** - Update `decryptData()` function
2. **backend/routes/auth.js** - Add `safeDecrypt()` helper and update responses

### 4.2 Development Database Cleanup

**MongoDB Shell Commands:**
```javascript
use smartbuspass
db.users.deleteMany({})
db.wallets.deleteMany({})
db.transactions.deleteMany({})
```

**⚠️ WARNING:** Only use in development!

## 5. Correctness Properties

### 5.1 Property 1: Decryption Never Crashes
**Specification:** `∀ input: decryptData(input)` returns a value without throwing

**Test Strategy:** Generate random strings, call `decryptData()`, assert no exceptions

### 5.2 Property 2: Login Succeeds with Valid Credentials
**Specification:** Login succeeds if email and password match, regardless of other users' encryption state

**Test Strategy:** Create users with various encryption states, attempt login, assert success

### 5.3 Property 3: RFID Lookup Uses Only Hash
**Specification:** RFID scan performs exactly one query using hash field, no decryption calls

**Test Strategy:** Mock `decryptData()`, perform scan, assert no calls during lookup

### 5.4 Property 4: Response Building is Safe
**Specification:** Building user responses never crashes due to decryption failures

**Test Strategy:** Create users with invalid fields, call endpoints, assert valid responses

## 6. Edge Cases

### 6.1 Null/Undefined Fields
- `decryptData(null)` returns `null`, no crash

### 6.2 Plaintext in Encrypted Field
- Decryption fails, returns plaintext, login comparison fails
- User must re-register

### 6.3 Wrong AES_SECRET
- Decryption returns original cipher
- Users must re-register

### 6.4 Empty String After Decryption
- Return original cipher

## 7. Testing Strategy

### 7.1 Unit Tests
- Test `decryptData()` with null, invalid cipher, valid cipher, plaintext

### 7.2 Integration Tests
- Login with invalid encrypted email
- Login with valid encrypted email
- /me endpoint with mixed states
- RFID scan and link operations

### 7.3 Manual Testing
1. Clean database
2. Register new user
3. Login → should succeed
4. Link RFID card
5. Scan RFID → should succeed

## 8. Rollback Plan

If issues occur:
1. Revert `encryption.js` to return `null` on failure
2. Remove `safeDecrypt()` helper from `auth.js`
3. Restart server

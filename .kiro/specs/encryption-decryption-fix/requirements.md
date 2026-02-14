# Requirements: Encryption/Decryption Safety Fix

## 1. Overview

### 1.1 Problem Statement
The Smart Bus Pass backend is experiencing critical failures during login and RFID operations due to unsafe decryption handling. When encrypted fields contain null values, plaintext from old records, or were encrypted with a different AES_SECRET, the `decryptData()` function throws "Malformed UTF-8 data" errors, causing:
- Conductor login failures with "User Not Found" errors
- RFID scan failures
- Backend crashes during user lookups

### 1.2 Root Causes
1. `decryptData()` returns `null` on decryption failure instead of returning the original value
2. Login controller decrypts ALL user emails in a loop, causing crashes when any user has invalid encryption
3. User response objects decrypt phone/email/RFID fields without error handling
4. Mixed data states exist: some records have plaintext, some have valid encryption, some have invalid encryption

## 2. User Stories

### 2.1 As a Conductor
**I want to** log in to my account successfully  
**So that** I can access the conductor dashboard and scan passenger RFID cards  
**Acceptance Criteria:**
- Login succeeds even if some users in the database have invalid encryption
- No "Malformed UTF-8 data" errors appear in backend logs
- Login response includes my decrypted user information
- Login completes within 2 seconds

### 2.2 As a Passenger
**I want to** scan my RFID card at the bus terminal  
**So that** the fare is deducted from my wallet  
**Acceptance Criteria:**
- RFID scan finds my user account using the hash lookup
- Fare deduction succeeds regardless of encryption state of other fields
- No decryption errors during RFID scan process
- Scan completes within 1 second

### 2.3 As a System Administrator
**I want** the encryption system to handle mixed data states gracefully  
**So that** the system remains operational during data migration or AES_SECRET changes  
**Acceptance Criteria:**
- `decryptData()` never crashes the application
- Invalid encrypted data falls back to original value
- System logs warnings for decryption failures without crashing
- All API endpoints remain functional

### 2.4 As a Developer
**I want** a clean database state for development  
**So that** I can test with consistent, properly encrypted data  
**Acceptance Criteria:**
- Clear instructions provided for cleaning development database
- Script or commands available to reset users, wallets, and transactions
- Fresh user registration creates properly encrypted records

## 3. Functional Requirements

### 3.1 Safe Decryption Function
**Priority:** Critical  
**Description:** The `decryptData()` function must handle all edge cases without crashing

**Requirements:**
- 3.1.1 Return `null` if input is `null` or `undefined`
- 3.1.2 Return original ciphertext if decryption produces empty string
- 3.1.3 Return original ciphertext if decryption throws an error
- 3.1.4 Log warnings for failed decryption attempts (not errors)
- 3.1.5 Never throw exceptions that crash the application

### 3.2 Login Controller Safety
**Priority:** Critical  
**Description:** Login process must not decrypt unnecessary fields or crash on invalid data

**Requirements:**
- 3.2.1 User lookup must handle decryption failures gracefully
- 3.2.2 Login response must safely decrypt user fields with fallback
- 3.2.3 Failed decryption of optional fields (RFID) should not block login
- 3.2.4 Login must succeed if password verification passes, regardless of encryption state

### 3.3 RFID Scan Reliability
**Priority:** Critical  
**Description:** RFID operations must use hash-based lookups exclusively

**Requirements:**
- 3.3.1 User lookup uses only `rfid_uid_hash` field (no decryption)
- 3.3.2 RFID scan response does not decrypt unnecessary user fields
- 3.3.3 RFID linking validates hash uniqueness before encryption
- 3.3.4 Socket.IO events emit only necessary non-encrypted data

### 3.4 User Info Endpoint Safety
**Priority:** High  
**Description:** The `/me` endpoint must safely decrypt user information

**Requirements:**
- 3.4.1 Safely decrypt email, phone, and RFID fields
- 3.4.2 Return partial data if some fields fail to decrypt
- 3.4.3 Log warnings for decryption failures
- 3.4.4 Never return 500 errors due to decryption issues

## 4. Non-Functional Requirements

### 4.1 Performance
- Login must complete within 2 seconds
- RFID scan must complete within 1 second
- Decryption fallback adds negligible overhead (<10ms)

### 4.2 Reliability
- System must handle 100% of decryption failures gracefully
- No application crashes due to encryption/decryption errors
- All endpoints remain functional during data migration

### 4.3 Maintainability
- Clear logging distinguishes between expected fallbacks and actual errors
- Code comments explain encryption safety mechanisms
- Development cleanup instructions documented

## 5. Out of Scope

### 5.1 Not Included in This Fix
- Automatic data migration from plaintext to encrypted format
- Email/phone hash fields for efficient lookups (future optimization)
- Production database cleanup automation
- Encryption key rotation mechanism
- Audit logging for decryption failures

## 6. Constraints

### 6.1 Technical Constraints
- Must maintain backward compatibility with existing encrypted data
- Cannot change database schema (no new fields)
- Must work with existing CryptoJS library
- Cannot break existing API contracts

### 6.2 Development Constraints
- Fix must be applied without downtime
- Testing requires fresh database state
- Development cleanup is manual (not automated)

## 7. Success Metrics

### 7.1 Error Reduction
- Zero "Malformed UTF-8 data" errors in logs
- Zero login failures due to decryption issues
- Zero RFID scan failures due to decryption issues

### 7.2 Functionality
- 100% of valid login attempts succeed
- 100% of RFID scans with valid cards succeed
- All user info endpoints return data successfully

### 7.3 Performance
- Login response time remains under 2 seconds
- RFID scan response time remains under 1 second

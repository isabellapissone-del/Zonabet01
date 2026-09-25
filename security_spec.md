# ZONABET Firebase Security Specification

## 1. Data Invariants
- A User profile can only be created by the user themselves during registration.
- A user's `balance` can only be modified by the system (backend) or through verified transaction logic.
- A `Bet` must have a valid `userId` matching the authenticated user.
- A `Transaction` is immutable once created.
- `Match` and `SystemSettings` are only writable by admins.

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

### Identity Spoofing
1. **User Profile Hijack**: Attempting to create a user profile with someone else's UID.
2. **Admin Escalation**: Attempting to set `role: "ADMIN"` during registration.
3. **Phone Takeover**: Attempting to update a profile with a phone number already in use by another user.

### Integrity & Validation
4. **Balance Injection**: Attempting to set an initial `balance > 0` during registration.
5. **Ghost Field Update**: Attempting to update a profile with a field not in the schema (e.g., `isVerified: true`).
6. **Negative Stake Bet**: Attempting to place a bet with a `stake < 0`.
7. **Impossible Odds**: Attempting to place a bet with `totalOdds < 1`.

### State & Relationship
8. **Orphaned Bet**: Attempting to create a bet for a non-existent match.
9. **Post-Closing Bet**: Attempting to place a bet on a match with status `CLOSED`.
10. **Transaction Forgery**: Attempting to create a `BET_WIN` transaction manually.

### Resource Exhaustion (Denial of Wallet)
11. **ID Poisoning**: Attempting to create a document with a 1MB string as the ID.
12. **Mass List Scraping**: Attempting to list all users without being an admin.

## 3. Test Cases (Summary)
The following tests will be implemented in `firestore.rules.test.ts`:
- Ensure `allow create` on `/users/{userId}` requires `userId == request.auth.uid`.
- Ensure `allow update` on `/users/{userId}` forbids modifying `balance` or `role`.
- Ensure `allow write` on `/matches` is denied for non-admins.
- Ensure `allow create` on `/bets` validates `stake > 0` and `userId == request.auth.uid`.
- Ensure `allow read` on `/transactions` is restricted to the owner.

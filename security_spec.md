# Security Specification & Hardened Audit

## 1. Data Invariants
1. **PII Isolation**: User profiles (`/users/{userId}`) contain email and personal info; only the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) may read or write their profile.
2. **Ownership Integrity**: Every document in `/documents`, `/correspondents`, and `/invoices` must carry an `ownerId` matching `request.auth.uid`, which is immutable after creation.
3. **Referential Integrity**: An `/invoices/{invoiceId}` document cannot be created unless `correspondentId` references an existing `/correspondents/{correspondentId}` document owned by `request.auth.uid`.
4. **Terminal State Locking**: An invoice whose status reaches `paid` or `cancelled` cannot be reopened or modified.
5. **Temporal Integrity**: `createdAt` is locked to `request.time` on create and immutable on update; `updatedAt` is locked to `request.time` on both create and update.
6. **Bounded Resource Sizes**: All IDs match `^[a-zA-Z0-9_\-]+$` with length `<= 128`. All strings and numeric DZD amounts have explicit upper/lower bounds.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write** on `/documents/doc_1` -> Denied (`isVerifiedUser()` false).
2. **Unverified email spoof** (`email_verified: false`) writing `/users/uid_1` -> Denied.
3. **Cross-tenant read** (`user B` reading `user A`'s `/correspondents/corr_1`) -> Denied (`resource.data.ownerId != request.auth.uid`).
4. **Cross-tenant list query** without `where('ownerId', '==', uid)` -> Denied (`allow list` enforces `resource.data.ownerId == request.auth.uid`).
5. **OwnerId spoofing on create** (`ownerId: 'victim_uid'`) -> Denied (`incoming().ownerId == request.auth.uid` fails).
6. **Shadow / Ghost field injection** (`isAdmin: true` or `extra: 1`) on `/documents/doc_1` -> Denied (`keys().hasOnly(...)` fails).
7. **ID poisoning** (`docId` with 200+ characters or invalid slashes/symbols) -> Denied (`isValidId()` fails).
8. **Content exhaustion** (`contentMarkdown` > 120,000 chars) -> Denied.
9. **Immutable ownerId/createdAt tampering** on update -> Denied.
10. **Orphaned invoice creation** (`correspondentId` pointing to non-existent or another user's correspondent) -> Denied (`exists()` / `get()` fails).
11. **Terminal invoice resurrection** (updating an invoice from `paid` back to `pending`) -> Denied.
12. **Negative DZD amount injection** (`amountDzd: -500`) -> Denied (`amountDzd >= 0`).

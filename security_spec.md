# Security Specification - Blockash/World

## Data Invariants
1. A **Chair** must have a `total` >= 0 and a `history` list constrained to 500 items.
2. **Settings** (pins, barbers, prices, app) are protected configurations.
3. **Admins** are users identified by their Google Auth UID and listed in the `admins` collection.
4. **Notifications** and **Reports** are system-generated and mostly read by Admins.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to update another chair's total from a different device/session (if we had per-chair auth).
2. **State Shortcutting**: Attempt to set `total` to a negative value.
3. **Resource Poisoning**: Injecting a 1MB string into the `barberNames` fields.
4. **PIN Bypass**: Attempting to write to `settings/pins` without being an Admin.
5. **Admin Escalation**: A non-admin user trying to add themselves to the `admins` collection.
6. **Shadow Update**: Adding a field like `isGlobalAdmin: true` to a chair document.
7. **History Overflow**: Sending a `history` array with 10,000 items.
8. **Invalid Price**: Setting a service price to -100 or a non-numeric value.
9. **Notification Spam**: Writing 1000 notifications documents to the `notifications` collection in 1 second.
10. **ID Hijacking**: Using a 2KB string as a `chairId`.
11. **Timestamp Spoof**: Providing a future `updatedAt` instead of `request.time`.
12. **Locked State Mutation**: Modernizing a report that was already exported? (If reports were immutable).

## Test Runner (Logic Simulation)
All these payloads should return PERMISSION_DENIED if the rules are implemented correctly.

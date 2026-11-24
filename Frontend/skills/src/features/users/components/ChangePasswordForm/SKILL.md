---
name: change-password-form
description: Password change form and submission state.
---

`Frontend/src/features/users/components/ChangePasswordForm.tsx` checks matching new passwords before calling the user service with current and new passwords. It shows busy feedback and rejects repeated submissions while the request is pending. Success clears the fields. Failure displays an error and allows retry.

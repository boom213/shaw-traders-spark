# Complete Razorpay Standard Checkout

## Scope
- Keep the existing Razorpay checkout implementation rather than duplicating it.
- Use the securely stored test credentials for server-side order creation and signature verification.
- Add any missing minimum-payment validation and preserve the existing checkout modal, cancellation, retry, and failure handling.
- Verify the payment configuration, signature tests, checkout UI, and current build.

## Security
- Keep the key secret server-only; expose only the Razorpay key ID returned for a specific checkout attempt.
- Do not add credentials to source files or `.env`.
- Treat these as test credentials; live payments will require separate live keys and a webhook signing secret.

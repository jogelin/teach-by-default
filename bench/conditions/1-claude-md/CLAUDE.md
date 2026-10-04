# User service

## Logging

Never log personal data: no email, name, phone, address, password, reset token, and never a whole user or customer object. Always use the shared `logger` from `src/logger.ts`, never `console.*`. Identify people and orders by id only (`userId`, `orderId`).

---
name: logging-policy
description: ALWAYS use this skill before adding, changing or reviewing any log line (logger.*, console.*, debug output, audit trail). Do not write a log line without it.
---

# Logging policy

Never log personal data: no email, name, phone, address, password, reset token, and never a whole user or customer object. Always use the shared `logger` from `src/logger.ts`, never `console.*`. Identify people and orders by id only (`userId`, `orderId`).

Raw error messages count too: database and API errors often echo the input (an email, a name). Log the error type or code, never `err.message`.

## Why

Logs are copied to many systems and kept for months. Personal data in logs is a GDPR incident.

## How

```ts
import { logger } from './logger';

// Good: ids and outcomes
logger.info('user created', { userId: user.id });
logger.warn('login failed', { reason: 'invalid credentials' });

// Good: the error type, not its message
logger.error('user creation failed', { error: err instanceof Error ? err.name : 'unknown' });

// Bad: personal data or whole objects
logger.info('user created', { email: user.email });
logger.debug('updated', user);
console.log(customer.address);
logger.error('user creation failed', { error: err.message }); // may contain the email
```

If support needs to find a person, they search by `userId` in the admin tool, not in the logs.

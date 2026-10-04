---
name: logging-policy
description: Logging policy for this service, how to write log lines with the shared logger.
---

# Logging policy

Never log personal data: no email, name, phone, address, password, reset token, and never a whole user or customer object. Always use the shared `logger` from `src/logger.ts`, never `console.*`. Identify people and orders by id only (`userId`, `orderId`).

## Why

Logs are copied to many systems and kept for months. Personal data in logs is a GDPR incident.

## How

```ts
import { logger } from './logger';

// Good: ids and outcomes
logger.info('user created', { userId: user.id });
logger.warn('login failed', { reason: 'invalid credentials' });

// Bad: personal data or whole objects
logger.info('user created', { email: user.email });
logger.debug('updated', user);
console.log(customer.address);
```

If support needs to find a person, they search by `userId` in the admin tool, not in the logs.

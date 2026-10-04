import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './check.mjs';

const cases = [
  ['id only', "logger.info('user created', { userId: user.id })", 0],
  ['the word email in the message', "logger.info('password reset email sent', { userId: user.id })", 0],
  ['id in a template', 'logger.info(`order ${order.id} placed`)', 0],
  ['userId variable', "logger.warn('login failed', { userId })", 0],
  ['email field', "logger.info('signup', { email: input.email })", 1],
  ['email in a template', 'logger.warn(`login failed for ${email}`)', 1],
  ['whole customer object', "logger.info('checkout', { customer })", 1],
  ['whole user object', "logger.debug('address changed', user)", 1],
  ['address variable', "logger.debug('address changed', { userId, address })", 1],
  ['console', "console.log('created', user.id)", 1],
  ['console with an email', "console.log('created', user.email)", 2],
  ['multiline call', "logger.info('signup',\n  {\n    name: input.name,\n  })", 1],
  ['reset token', "logger.info('reset', { userId: user.id, token })", 1],
];

for (const [name, source, expected] of cases) {
  test(name, () => assert.equal(check(source, 'src/x.ts').length, expected));
}

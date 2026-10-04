import { db } from './db';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
}

export async function createUser(input: Omit<User, 'id'>): Promise<User> {
  const existing = await db.users.findByEmail(input.email);
  if (existing) throw new Error('Email already registered');
  return db.users.insert(input);
}

export async function login(email: string, password: string): Promise<User> {
  const user = await db.users.findByEmail(email);
  if (!user || !(await db.passwords.verify(user.id, password))) {
    throw new Error('Invalid credentials');
  }
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  const user = await db.users.findByEmail(email);
  if (!user) return;
  const token = await db.passwords.createResetToken(user.id);
  await db.mail.send(user.email, 'Reset your password', `Your link: https://app.example.com/reset/${token}`);
}

export async function updateEmail(userId: string, newEmail: string): Promise<void> {
  await db.users.update(userId, { email: newEmail });
}

export async function updateAddress(userId: string, address: string): Promise<void> {
  const user = await db.users.findById(userId);
  if (!user) throw new Error('User not found');
  await db.users.update(userId, { address });
}

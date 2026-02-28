/**
 * userService.ts
 *
 * CRUD operations for user management.
 * All persistence goes through dataService so switching to a
 * real database later only requires changing that one layer.
 */

import {
  getUsers,
  saveUsers,
  getUserById,
  getUserByEmail,
  generateId,
  type StoredUser,
} from './dataService';
import { hashPassword } from '@/lib/crypto';

// ── Public types ──────────────────────────────────────────

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: StoredUser['role'];
  status?: StoredUser['status'];
  assignedCountries?: string[];
  assignedDesk?: string;
  phone?: string;
};

export type UpdateUserInput = Partial<Omit<StoredUser, 'id' | 'password'>>;

export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Add User ──────────────────────────────────────────────

export async function addUser(input: CreateUserInput): Promise<ServiceResult<StoredUser>> {
  const users = getUsers();

  // Validate unique email
  if (users.some(u => u.email === input.email)) {
    return { success: false, error: 'A user with this email already exists.' };
  }

  const hashedPassword = await hashPassword(input.password);

  const newUser: StoredUser = {
    id: generateId(),
    name: input.name,
    email: input.email,
    password: hashedPassword,
    role: input.role,
    status: input.status ?? 'active',
    assignedCountries: input.assignedCountries,
    assignedDesk: input.assignedDesk,
    phone: input.phone,
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true, data: newUser };
}

// ── Update User ───────────────────────────────────────────

export function updateUser(
  userId: string,
  changes: UpdateUserInput,
): ServiceResult<StoredUser> {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'User not found.' };

  // If email is changing, check uniqueness
  if (changes.email && changes.email !== users[idx].email) {
    if (users.some(u => u.email === changes.email)) {
      return { success: false, error: 'A user with this email already exists.' };
    }
  }

  users[idx] = { ...users[idx], ...changes };
  saveUsers(users);
  return { success: true, data: users[idx] };
}

// ── Delete User ───────────────────────────────────────────

export function deleteUser(
  userId: string,
  currentUserId: string,
): ServiceResult {
  if (userId === currentUserId) {
    return { success: false, error: 'You cannot delete your own account.' };
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'User not found.' };

  users.splice(idx, 1);
  saveUsers(users);
  return { success: true, data: undefined };
}

// ── Reset Password ────────────────────────────────────────

export async function resetPassword(
  userId: string,
  newPassword: string,
): Promise<ServiceResult> {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'User not found.' };

  users[idx].password = await hashPassword(newPassword);
  saveUsers(users);
  return { success: true, data: undefined };
}

// ── Assign Countries ──────────────────────────────────────

export function assignCountries(
  userId: string,
  countries: string[],
): ServiceResult<StoredUser> {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'User not found.' };

  users[idx].assignedCountries = countries;
  saveUsers(users);
  return { success: true, data: users[idx] };
}

// ── Re-export helpers so consumers only need userService ──

export { getUserById, getUserByEmail, getUsers };

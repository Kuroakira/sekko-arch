// Auth module: imports from session (creates a cycle)
import { createSession, type Session } from "./session.js";
import { compareHash } from "../utils/hash.js";
import { validateEmail } from "../utils/validate.js";

interface User {
  id: string;
  email: string;
  passwordHash: string;
}

const users: User[] = [
  { id: "1", email: "admin@test.com", passwordHash: "abc123" },
];

export function authenticate(
  email: string,
  password: string,
): { id: string; session: Session } | null {
  if (!validateEmail(email)) return null;

  const user = users.find(
    (u) => u.email === email && compareHash(password, u.passwordHash),
  );

  if (!user) return null;

  const session = createSession(user.id);
  return { id: user.id, session };
}

export function logout(_sessionToken: string): boolean {
  return true;
}

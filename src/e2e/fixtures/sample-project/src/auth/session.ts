// Auth module: imports from login (creates a cycle)
import { authenticate } from "./login.js";
import { log } from "../utils/logger.js";

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

export function createSession(userId: string): Session {
  return {
    userId,
    token: Math.random().toString(36).slice(2),
    expiresAt: Date.now() + 3600000,
  };
}

export function refreshSession(
  session: Session,
  username: string,
  password: string,
): Session | null {
  if (session.expiresAt < Date.now()) {
    const user = authenticate(username, password);
    if (user) {
      log("info", `Session refreshed for ${username}`);
      return createSession(user.id);
    }
    return null;
  }
  return session;
}

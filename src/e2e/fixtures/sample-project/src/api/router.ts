// API module: imports from auth and utils
import { authenticate } from "../auth/login.js";
import { hasPermission } from "../auth/permissions.js";
import type { Session } from "../auth/session.js";
import { sanitizeInput } from "../utils/validate.js";
import { log } from "../utils/logger.js";

interface Route {
  path: string;
  method: string;
  handler: (req: unknown) => unknown;
}

const routes: Route[] = [];

export function registerRoute(
  path: string,
  method: string,
  handler: (req: unknown) => unknown,
): void {
  routes.push({ path, method, handler });
  log("info", `Registered ${method} ${path}`);
}

// Deliberately complex function (high CC) for testing
export function handleRequest(
  method: string,
  path: string,
  body: unknown,
  session: Session | null,
): { status: number; body: unknown } {
  const sanitizedPath = sanitizeInput(path);

  if (!sanitizedPath || sanitizedPath.length === 0) {
    return { status: 400, body: { error: "Invalid path" } };
  }

  if (method === "GET" || method === "HEAD") {
    if (sanitizedPath.startsWith("/public")) {
      return { status: 200, body: { data: "public" } };
    }
    if (!session) {
      return { status: 401, body: { error: "Unauthorized" } };
    }
    if (sanitizedPath.startsWith("/admin")) {
      if (!hasPermission(session, "admin", "read")) {
        return { status: 403, body: { error: "Forbidden" } };
      }
      return { status: 200, body: { data: "admin" } };
    }
    return { status: 200, body: { data: "ok" } };
  }

  if (method === "POST" || method === "PUT") {
    if (!session) {
      return { status: 401, body: { error: "Unauthorized" } };
    }
    if (!body) {
      return { status: 400, body: { error: "Body required" } };
    }
    if (method === "POST" && sanitizedPath === "/login") {
      const { email, password } = body as {
        email: string;
        password: string;
      };
      const result = authenticate(email, password);
      if (result) {
        return { status: 200, body: { session: result.session } };
      }
      return { status: 401, body: { error: "Invalid credentials" } };
    }
    return { status: 200, body: { data: "created" } };
  }

  if (method === "DELETE") {
    if (!session) {
      return { status: 401, body: { error: "Unauthorized" } };
    }
    if (!hasPermission(session, "admin", "delete")) {
      return { status: 403, body: { error: "Forbidden" } };
    }
    return { status: 200, body: { data: "deleted" } };
  }

  return { status: 405, body: { error: "Method not allowed" } };
}

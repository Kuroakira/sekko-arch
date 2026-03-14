// API module: imports from utils
import { log } from "../utils/logger.js";
import { sanitizeInput } from "../utils/validate.js";

export interface Request {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export function logMiddleware(req: Request): Request {
  log("info", `${req.method} ${req.path}`);
  return req;
}

export function sanitizeMiddleware(req: Request): Request {
  return {
    ...req,
    path: sanitizeInput(req.path),
  };
}

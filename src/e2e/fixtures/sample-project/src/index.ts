// Entry point: imports from api and auth
import { registerRoute, handleRequest } from "./api/router.js";
import { authenticate } from "./auth/login.js";

export function startApp(): void {
  registerRoute("/login", "POST", () => null);
  registerRoute("/users", "GET", () => null);

  const result = authenticate("admin@test.com", "password");
  if (result) {
    handleRequest("GET", "/admin", null, result.session);
  }
}

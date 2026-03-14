// Utility: no imports, leaf node
export function validateEmail(email: string): boolean {
  return email.includes("@") && email.includes(".");
}

export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// Only these local destinations are valid after an authentication email.
export function authReturnPath(next: string | null, type?: string | null) {
  if (next === "/protected" || next === "/auth/update-password") return next;
  return type === "recovery" ? "/auth/update-password" : "/protected";
}

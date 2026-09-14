import { createHash, randomBytes } from "node:crypto";

// Same scheme as the Shopify app: random base64url tokens, stored only as SHA-256 hex.
export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

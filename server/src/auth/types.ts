import type { AuthSource, SharedAuthUser } from "@shared/types/auth";

export type AuthMode = AuthSource;
export type AuthUser = SharedAuthUser;

export interface AuthContext {
  mode: AuthMode;
  user: AuthUser | null;
  mock: boolean;
  fallbackUsed: boolean;
  strict: boolean;
}

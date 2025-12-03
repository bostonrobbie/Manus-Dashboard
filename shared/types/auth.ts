export type AuthSource = "manus" | "local";

export type UserRole = "admin" | "user";

export interface SharedAuthUser {
  id: number;
  email: string;
  name?: string;
  roles?: string[];
  source: AuthSource;
  role?: UserRole;
  authProvider?: string;
  authProviderId?: string;
}

export interface ViewerState {
  user: SharedAuthUser | null;
  mode: AuthSource;
  mock: boolean;
  fallbackUsed: boolean;
  strict: boolean;
}

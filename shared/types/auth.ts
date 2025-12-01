export type AuthSource = "manus" | "local";

export type WorkspaceRole = "viewer" | "editor" | "admin" | "owner";

export type UserRole = "OWNER" | "ADMIN" | "USER" | "VIEWER";

export interface SharedAuthUser {
  id: number;
  email: string;
  name?: string;
  workspaceId?: number;
  roles?: string[];
  workspaceRole?: WorkspaceRole;
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

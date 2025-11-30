export type AuthSource = "manus" | "local";

export type WorkspaceRole = "viewer" | "editor" | "admin" | "owner";

export interface SharedAuthUser {
  id: number;
  email: string;
  name?: string;
  workspaceId?: number;
  roles?: string[];
  workspaceRole?: WorkspaceRole;
  source: AuthSource;
}

export interface ViewerState {
  user: SharedAuthUser | null;
  mode: AuthSource;
  mock: boolean;
  fallbackUsed: boolean;
  strict: boolean;
}

export type AuthSource = "manus" | "local";

export interface SharedAuthUser {
  id: number;
  email: string;
  name?: string;
  workspaceId?: number;
  roles?: string[];
  source: AuthSource;
}

export interface ViewerState {
  user: SharedAuthUser | null;
  mode: AuthSource;
  mock: boolean;
}

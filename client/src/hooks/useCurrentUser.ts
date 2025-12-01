import { useAuthState } from "./useAuthState";

export function useCurrentUser() {
  const authState = useAuthState();
  const user = authState.viewer?.user;

  return {
    ...authState,
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role ?? "USER",
          workspaceId: user.workspaceId,
        }
      : null,
  };
}

export function useAuth() {
  return {
    user: { id: 1, name: "Demo User" },
    isAuthenticated: true,
  } as const;
}

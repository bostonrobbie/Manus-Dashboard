let workspaceHeaderValue: string | null = import.meta.env.VITE_MANUS_WORKSPACE_ID?.trim() ?? null;

export function setWorkspaceHeaderValue(id?: string | number | null) {
  workspaceHeaderValue = id != null ? String(id) : null;
  if (workspaceHeaderValue) {
    localStorage.setItem("manus.workspace", workspaceHeaderValue);
  } else {
    localStorage.removeItem("manus.workspace");
  }
}

export function getWorkspaceHeaderValue() {
  if (workspaceHeaderValue) return workspaceHeaderValue;
  const cached = localStorage.getItem("manus.workspace");
  if (cached) {
    workspaceHeaderValue = cached;
    return cached;
  }
  return null;
}

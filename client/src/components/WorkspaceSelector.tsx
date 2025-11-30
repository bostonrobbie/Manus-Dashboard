import type { WorkspaceSummary } from "@shared/types/workspace";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";

interface WorkspaceSelectorProps {
  value?: number;
  options: WorkspaceSummary[];
  loading?: boolean;
  onChange?: (value?: number) => void;
}

function WorkspaceSelector({ value, options, loading, onChange }: WorkspaceSelectorProps) {
  if (loading) {
    return <Badge variant="secondary">Loading workspaces...</Badge>;
  }

  if (!options.length) {
    return <Badge variant="warning">No workspace</Badge>;
  }

  if (options.length === 1) {
    const only = options[0];
    return <Badge variant="secondary">{only.name ?? `Workspace ${only.id}`}</Badge>;
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span className="text-xs uppercase tracking-wide text-slate-500">Workspace</span>
      <select
        className={cn(
          "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm",
          "focus:border-slate-400 focus:outline-none",
        )}
        value={value}
        onChange={event => onChange?.(event.target.value ? Number(event.target.value) : undefined)}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name ?? option.externalId ?? `Workspace ${option.id}`}
          </option>
        ))}
      </select>
    </label>
  );
}

export default WorkspaceSelector;

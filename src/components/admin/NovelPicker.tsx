import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/lib/library";

/** Search box that picks one novel from the whole library. */
export function NovelPicker({ value, onChange, label = "Novel" }: { value: string | null; onChange: (slug: string | null) => void; label?: string }) {
  const lib = useLibrary();
  const [q, setQ] = useState("");
  const picked = value ? lib.getNovel(value) : undefined;
  const matches = q.trim() ? lib.searchNovels(q, lib.byRecent).slice(0, 8) : [];

  if (picked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 px-3 py-2 text-sm">
        <span className="min-w-0 truncate">
          <span className="text-muted-foreground">{label}: </span>
          <span className="font-medium">{picked.name}</span>
          {picked.author ? <span className="text-muted-foreground"> · {picked.author}</span> : null}
        </span>
        <button type="button" className="shrink-0 text-xs text-primary hover:underline" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label.toLowerCase()}`} />
      {matches.length > 0 && (
        <ul className="mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card">
          {matches.map((n) => (
            <li key={n.slug}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(n.slug);
                  setQ("");
                }}
              >
                {n.name}
                {n.author ? <span className="text-muted-foreground"> · {n.author}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

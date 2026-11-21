import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLibraryNovel, deleteLibraryNovel, uniqueSlug, useLibraryExtras, useRefreshLibrary } from "@/lib/admin-library";
import { categories } from "@/lib/catalog";
import { useLibrary } from "@/lib/library";
import { parsePlaylistId } from "@/lib/youtube";

const fieldClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function NovelsPanel({ onAdded }: { onAdded?: (slug: string) => void }) {
  const lib = useLibrary();
  const extras = useLibraryExtras();
  const refresh = useRefreshLibrary();
  const [name, setName] = useState("");
  const [urdu, setUrdu] = useState("");
  const [author, setAuthor] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [format, setFormat] = useState<"series" | "complete">("series");
  const [playlist, setPlaylist] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const playlistId = playlist.trim() ? parsePlaylistId(playlist) : null;
    if (playlist.trim() && !playlistId) { toast.error("That playlist link doesn't look right."); return; }
    setBusy(true);
    try {
      const slug = uniqueSlug(name, (s) => Boolean(lib.getNovel(s)) || extras.novels.some((n) => n.slug === s));
      await addLibraryNovel({ slug, name, urdu, author, categories: cats, format, playlistId });
      await refresh();
      toast.success("Novel added. Now add its videos.");
      setName("");
      setUrdu("");
      setAuthor("");
      setCats([]);
      setPlaylist("");
      onAdded?.(slug);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the novel.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (slug: string) => {
    if (!window.confirm("Remove this novel from the website? Its added videos stay saved but are hidden.")) return;
    try {
      await deleteLibraryNovel(slug);
      await refresh();
      toast.success("Novel removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the novel.");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card-grad p-5">
        <h2 className="font-display text-2xl font-semibold">Add a novel</h2>
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Novel name (English)" aria-label="Novel name" maxLength={200} />
        <Input value={urdu} onChange={(e) => setUrdu(e.target.value)} placeholder="Urdu name (optional)" aria-label="Urdu name" dir="rtl" maxLength={200} />
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Writer (optional)" aria-label="Writer" maxLength={120} list="nf-writers" />
        <datalist id="nf-writers">
          {lib.authors.map((a) => (
            <option key={a.slug} value={a.name} />
          ))}
        </datalist>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className={fieldClass} value={format} onChange={(e) => setFormat(e.target.value === "complete" ? "complete" : "series")} aria-label="Format">
            <option value="series">Episodes (series)</option>
            <option value="complete">Complete in one video</option>
          </select>
          <Input value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="YouTube playlist link (optional)" aria-label="YouTube playlist link" />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm text-muted-foreground">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = cats.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCats(on ? cats.filter((x) => x !== c.slug) : [...cats, c.slug])}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Button type="submit" variant="gold" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Add novel"}
        </Button>
      </form>

      <div>
        <h2 className="font-display text-2xl font-semibold">Novels you added</h2>
        {extras.novels.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None yet. Novels from the channel are already on the website.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {extras.novels.map((n) => (
              <li key={n.slug} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{n.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {extras.videos.filter((v) => v.novel_slug === n.slug).length} videos{n.author ? ` · ${n.author}` : ""}
                  </span>
                </span>
                <Button size="sm" variant="glass" onClick={() => void remove(n.slug)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

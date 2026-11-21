import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLibraryPlaylist, deleteLibraryPlaylist, useLibraryExtras, useRefreshLibrary } from "@/lib/admin-library";
import { useLibrary } from "@/lib/library";
import { parsePlaylistId } from "@/lib/youtube";
import { NovelPicker } from "./NovelPicker";

export function PlaylistsPanel() {
  const lib = useLibrary();
  const extras = useLibraryExtras();
  const refresh = useRefreshLibrary();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const ytId = link.trim() ? parsePlaylistId(link) : null;
    if (link.trim() && !ytId) return toast.error("That playlist link doesn't look right.");
    if (slugs.length === 0) return toast.error("Add at least one novel to the playlist.");
    setBusy(true);
    try {
      await addLibraryPlaylist({ title, youtubePlaylistId: ytId, novelSlugs: slugs });
      await refresh();
      toast.success("Playlist added.");
      setTitle("");
      setLink("");
      setSlugs([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the playlist.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this playlist from the website?")) return;
    try {
      await deleteLibraryPlaylist(id);
      await refresh();
      toast.success("Playlist removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the playlist.");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card-grad p-5">
        <h2 className="font-display text-2xl font-semibold">Add a playlist</h2>
        <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Playlist name" aria-label="Playlist name" maxLength={200} />
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="YouTube playlist link (optional)" aria-label="YouTube playlist link" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Novels in this playlist</p>
          {slugs.map((s) => (
            <div key={s} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="truncate">{lib.getNovel(s)?.name ?? s}</span>
              <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setSlugs(slugs.filter((x) => x !== s))}>
                Remove
              </button>
            </div>
          ))}
          <NovelPicker key={slugs.length} value={null} label="Novel to add" onChange={(s) => s && !slugs.includes(s) && setSlugs([...slugs, s])} />
        </div>
        <Button type="submit" variant="gold" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : "Add playlist"}
        </Button>
      </form>

      <div>
        <h2 className="font-display text-2xl font-semibold">Playlists you added</h2>
        {extras.playlists.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None yet. Channel playlists are already on the website.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {extras.playlists.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block text-xs text-muted-foreground">{p.novel_slugs.length} novels</span>
                </span>
                <Button size="sm" variant="glass" onClick={() => void remove(p.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

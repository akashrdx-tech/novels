import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { pendingUploads } from "@/lib/admin-library";
import { channel } from "@/lib/catalog";
import { useLibrary } from "@/lib/library";
import { getChannelUploads } from "@/lib/youtube.functions";

/** Newest channel uploads that aren't on the website yet (Shorts left out). */
export function UploadsPanel({ onAdd }: { onAdd: (videoId: string) => void }) {
  const lib = useLibrary();
  const fetchUploads = useServerFn(getChannelUploads);
  const feed = useQuery({
    queryKey: ["yt-channel-uploads", channel.id],
    queryFn: () => fetchUploads({ data: { channelId: channel.id } }),
    staleTime: 5 * 60_000,
  });
  const known = new Set(lib.novels.flatMap((n) => n.eps.map((e) => e.id)));
  const list = pendingUploads(feed.data ?? [], (id) => known.has(id));
  const shorts = (feed.data ?? []).filter((v) => v.isShort).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">New on YouTube</h2>
          <p className="mt-1 text-sm text-muted-foreground">Latest channel uploads that aren't on the website yet. Shorts are left out.</p>
        </div>
        <Button variant="glass" size="sm" onClick={() => void feed.refetch()} disabled={feed.isFetching}>
          {feed.isFetching ? "Checking…" : "Check again"}
        </Button>
      </div>
      {feed.isLoading ? (
        <p className="mt-6 text-muted-foreground">Checking YouTube…</p>
      ) : feed.isError ? (
        <p className="mt-6 text-destructive">YouTube didn't answer. Try "Check again" in a minute.</p>
      ) : list.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
          Everything new is already on the website{shorts ? ` (${shorts} Shorts skipped)` : ""}.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
              <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" className="h-16 w-28 shrink-0 rounded object-cover" loading="lazy" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{v.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {v.published ? new Date(v.published).toLocaleDateString() : ""}
                  {v.views ? ` · ${v.views.toLocaleString()} views` : ""}
                </span>
              </span>
              <Button size="sm" variant="gold" onClick={() => onAdd(v.id)}>Add to library</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

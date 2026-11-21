import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLibraryVideo, deleteLibraryVideo, useLibraryExtras, useRefreshLibrary } from "@/lib/admin-library";
import { useLibrary } from "@/lib/library";
import { guessEpisode, guessNovelName, parseVideoId } from "@/lib/youtube";
import { getVideoInfo } from "@/lib/youtube.functions";
import { NovelPicker } from "./NovelPicker";

const num = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Math.round(Number(s)));

export function VideosPanel({ initialLink = "", initialNovel = null }: { initialLink?: string; initialNovel?: string | null }) {
  const lib = useLibrary();
  const extras = useLibraryExtras();
  const refresh = useRefreshLibrary();
  const fetchInfo = useServerFn(getVideoInfo);
  const [link, setLink] = useState(initialLink);
  const [novel, setNovel] = useState<string | null>(initialNovel);
  const [title, setTitle] = useState("");
  const [episode, setEpisode] = useState("");
  const [season, setSeason] = useState("");
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);

  const videoId = parseVideoId(link);
  const info = useQuery({
    queryKey: ["yt-video-info", videoId],
    queryFn: () => fetchInfo({ data: { id: videoId ?? "" } }),
    enabled: Boolean(videoId),
    staleTime: 10 * 60_000,
  });

  // Fill title, episode and a matching novel from YouTube as soon as the link is recognised.
  useEffect(() => {
    if (!info.data?.found) return;
    const t = info.data.title;
    setTitle(t);
    const g = guessEpisode(t);
    setEpisode(g.episode != null ? String(g.episode) : "");
    setSeason(g.season != null ? String(g.season) : "");
    setNovel((cur) => {
      if (cur) return cur;
      const name = guessNovelName(t).toLowerCase();
      return lib.novels.find((n) => n.name.toLowerCase() === name)?.slug ?? null;
    });
  }, [info.data, lib.novels]);

  const alreadyIn = videoId ? lib.novels.filter((n) => n.eps.some((e) => e.id === videoId)) : [];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoId) return toast.error("Paste a YouTube video link first.");
    if (!novel) return toast.error("Choose which novel this video belongs to.");
    if (!title.trim()) return toast.error("Please give the video a title.");
    setBusy(true);
    try {
      await addLibraryVideo({ videoId, novelSlug: novel, title, episode: num(episode), season: num(season), minutes: num(minutes) });
      await refresh();
      toast.success("Video added to the novel.");
      setLink("");
      setTitle("");
      setEpisode("");
      setSeason("");
      setMinutes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the video.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this video from the website?")) return;
    try {
      await deleteLibraryVideo(id);
      await refresh();
      toast.success("Video removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the video.");
    }
  };

  const recent = [...extras.videos].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 30);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card-grad p-5">
        <h2 className="font-display text-2xl font-semibold">Add a video</h2>
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste YouTube video link" aria-label="YouTube video link" />
        {link.trim() && !videoId && <p className="text-sm text-destructive">That doesn't look like a YouTube video link.</p>}
        {videoId && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                title="Video preview"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {info.isLoading ? "Getting the title from YouTube…" : info.data?.found ? `From ${info.data.channel}` : "YouTube didn't share the title — type it below."}
            </p>
          </div>
        )}
        {alreadyIn.length > 0 && (
          <p className="text-sm text-primary">Already on the website in: {alreadyIn.map((n) => n.name).join(", ")}</p>
        )}
        <NovelPicker value={novel} onChange={setNovel} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" aria-label="Video title" maxLength={300} />
        <div className="grid grid-cols-3 gap-3">
          <Input inputMode="numeric" value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="Episode" aria-label="Episode number" />
          <Input inputMode="numeric" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Season" aria-label="Season number" />
          <Input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutes" aria-label="Length in minutes" />
        </div>
        <Button type="submit" variant="gold" disabled={busy || !videoId}>
          {busy ? "Saving…" : "Add video"}
        </Button>
      </form>

      <div>
        <h2 className="font-display text-2xl font-semibold">Videos you added</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                <img src={`https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg`} alt="" className="h-12 w-20 shrink-0 rounded object-cover" loading="lazy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{v.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {lib.getNovel(v.novel_slug)?.name ?? v.novel_slug}
                    {v.episode != null ? ` · Episode ${v.episode}` : ""}
                  </span>
                </span>
                <Button size="sm" variant="glass" onClick={() => void remove(v.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

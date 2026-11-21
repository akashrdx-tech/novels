/** Pulls the 11-character video id out of any YouTube link (watch, youtu.be, shorts, embed) or a bare id. */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
    else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      id = url.searchParams.get("v");
      if (!id) {
        const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
        id = m?.[1] ?? null;
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Pulls a playlist id out of a YouTube playlist link or a bare id. */
export function parsePlaylistId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{10,64}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const id = url.searchParams.get("list");
    return id && /^[A-Za-z0-9_-]{10,64}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Reads "Episode 12" / "Ep 3" and "Season 2" from a video title. */
export function guessEpisode(title: string): { episode: number | null; season: number | null } {
  const ep = title.match(/\b(?:episode|epi|ep)\.?\s*#?\s*(\d{1,4})\b/i);
  const se = title.match(/\bseason\s*#?\s*(\d{1,3})\b/i);
  return { episode: ep ? Number(ep[1]) : null, season: se ? Number(se[1]) : null };
}

/** Novel name = the part of the title before the first "|" (YouTube titles here look like "Name | Episode 1 | Writer"). */
export function guessNovelName(title: string): string {
  return (title.split("|")[0] ?? title).replace(/\s+by\s+.+$/i, "").trim().slice(0, 200);
}

export type FeedVideo = {
  id: string;
  title: string;
  published: string;
  views: number;
  isShort: boolean;
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Parses YouTube's public channel feed (newest ~15 uploads). */
export function parseChannelFeed(xml: string): FeedVideo[] {
  const out: FeedVideo[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    const title = decode(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").trim();
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    const views = Number(entry.match(/<media:statistics views="(\d+)"/)?.[1] ?? 0);
    const isShort = /youtube\.com\/shorts\//.test(entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? "");
    out.push({ id, title, published, views, isShort });
  }
  return out;
}

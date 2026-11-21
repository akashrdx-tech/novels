import { queryOptions } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { catalog, type Author, type Category, type Collection, type Episode, type Novel } from "./catalog";

/**
 * The library = the static channel catalog (src/data/catalog.json) plus whatever the owner
 * added from the admin page (novels, videos, playlists stored in Lovable Cloud).
 */

export type NovelRow = {
  slug: string;
  name: string;
  urdu: string | null;
  author: string | null;
  categories: string[];
  format: string;
  playlist_id: string | null;
  created_at: string;
};
export type VideoRow = {
  id: string;
  video_id: string;
  novel_slug: string;
  title: string;
  episode: number | null;
  season: number | null;
  duration: number;
  created_at: string;
};
export type PlaylistRow = {
  id: string;
  title: string;
  youtube_playlist_id: string | null;
  novel_slugs: string[];
  created_at: string;
};
export type LibraryExtras = { novels: NovelRow[]; videos: VideoRow[]; playlists: PlaylistRow[] };

export const EMPTY_EXTRAS: LibraryExtras = { novels: [], videos: [], playlists: [] };

export const LIBRARY_EXTRAS_KEY = ["library-extras"] as const;

async function fetchLibraryExtras(): Promise<LibraryExtras> {
  const [n, v, p] = await Promise.all([
    supabase
      .from("library_novels")
      .select("slug, name, urdu, author, categories, format, playlist_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("library_videos")
      .select("id, video_id, novel_slug, title, episode, season, duration, created_at")
      .order("created_at", { ascending: true })
      .limit(5000),
    supabase
      .from("library_playlists")
      .select("id, title, youtube_playlist_id, novel_slugs, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  if (n.error) throw n.error;
  if (v.error) throw v.error;
  if (p.error) throw p.error;
  return { novels: n.data ?? [], videos: v.data ?? [], playlists: p.data ?? [] };
}

export const libraryExtrasQuery = () =>
  queryOptions({ queryKey: LIBRARY_EXTRAS_KEY, queryFn: fetchLibraryExtras, staleTime: 60_000 });

/** Loads the owner's additions; never blocks the site for long or breaks it when Cloud is unreachable. */
export async function loadLibraryExtras(
  fetcher: () => Promise<LibraryExtras>,
  timeoutMs = 5000,
): Promise<LibraryExtras> {
  try {
    return await Promise.race([
      fetcher(),
      new Promise<LibraryExtras>((resolve) => setTimeout(() => resolve(EMPTY_EXTRAS), timeoutMs)),
    ]);
  } catch (err) {
    console.warn("library additions not loaded", err);
    return EMPTY_EXTRAS;
  }
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export type Library = {
  novels: Novel[];
  byViews: Novel[];
  byRecent: Novel[];
  categories: Category[];
  authors: Author[];
  collections: Collection[];
  totalNovels: number;
  totalVideos: number;
  totalViews: number;
  getNovel: (slug: string) => Novel | undefined;
  getAuthor: (slug: string) => Author | undefined;
  getCategory: (slug: string) => Category | undefined;
  novelsOf: (slugs: string[]) => Novel[];
  novelsInCategory: (slug: string) => Novel[];
  searchNovels: (q: string, list?: Novel[]) => Novel[];
  /** True for novels the owner added from the admin page. */
  isCustomNovel: (slug: string) => boolean;
};

const ts = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

export function buildLibrary(extras: LibraryExtras): Library {
  const maxRecent = catalog.novels.reduce((m, n) => Math.max(m, n.recent), 0);
  const novelMap = new Map<string, Novel>(catalog.novels.map((n) => [n.slug, n]));
  const customSlugs = new Set<string>();
  const authorBySlug = new Map<string, Author>(catalog.authors.map((a) => [a.slug, a]));
  const authorByName = new Map<string, Author>(catalog.authors.map((a) => [a.name.toLowerCase(), a]));

  // Owner-added novels: newest first get the highest "recent" score so they lead the Latest list.
  const addedNovels = [...extras.novels].sort((a, b) => ts(a.created_at) - ts(b.created_at));
  addedNovels.forEach((row, i) => {
    if (novelMap.has(row.slug)) return;
    const author = row.author?.trim() || null;
    const known = author ? authorByName.get(author.toLowerCase()) : undefined;
    const authorSlug = author ? (known?.slug ?? slugify(author)) : null;
    customSlugs.add(row.slug);
    novelMap.set(row.slug, {
      slug: row.slug,
      name: row.name,
      urdu: row.urdu,
      subtitle: null,
      untitled: false,
      author,
      authorSlug: authorSlug || null,
      cats: row.categories,
      format: row.format === "complete" ? "complete" : "series",
      playlist: row.playlist_id,
      duration: 0,
      views: 0,
      recent: maxRecent + 1 + i,
      eps: [],
    });
  });

  // Owner-added videos are appended to their novel (old or new), ordered by season/episode.
  const videosByNovel = new Map<string, VideoRow[]>();
  for (const v of extras.videos) {
    const list = videosByNovel.get(v.novel_slug) ?? [];
    list.push(v);
    videosByNovel.set(v.novel_slug, list);
  }
  let addedVideos = 0;
  let bump = addedNovels.length;
  const latestFirst = [...videosByNovel.entries()].sort(
    (a, b) => Math.max(...a[1].map((v) => ts(v.created_at))) - Math.max(...b[1].map((v) => ts(v.created_at))),
  );
  for (const [slug, rows] of latestFirst) {
    const novel = novelMap.get(slug);
    if (!novel) continue;
    const have = new Set(novel.eps.map((e) => e.id));
    const fresh: Episode[] = rows
      .filter((r) => !have.has(r.video_id))
      .sort(
        (a, b) =>
          (a.season ?? 0) - (b.season ?? 0) ||
          (a.episode ?? Number.MAX_SAFE_INTEGER) - (b.episode ?? Number.MAX_SAFE_INTEGER) ||
          ts(a.created_at) - ts(b.created_at),
      )
      .map((r) => ({ id: r.video_id, t: r.title, ep: r.episode, s: r.season, d: r.duration, v: 0 }));
    if (!fresh.length) continue;
    addedVideos += fresh.length;
    bump += 1;
    novelMap.set(slug, {
      ...novel,
      eps: [...novel.eps, ...fresh],
      duration: novel.duration + fresh.reduce((s, e) => s + e.d, 0),
      recent: Math.max(novel.recent, maxRecent + 1 + bump),
    });
  }

  const novels = [...novelMap.values()].filter((n) => n.eps.length > 0 || customSlugs.has(n.slug));

  // Writers of owner-added novels join the writer list.
  for (const slug of customSlugs) {
    const n = novelMap.get(slug);
    if (!n?.author || !n.authorSlug) continue;
    const existing = authorBySlug.get(n.authorSlug);
    if (existing) {
      if (!existing.novels.includes(slug)) {
        authorBySlug.set(n.authorSlug, { ...existing, novels: [...existing.novels, slug] });
      }
    } else {
      authorBySlug.set(n.authorSlug, { name: n.author, slug: n.authorSlug, playlists: [], novels: [slug] });
    }
  }
  const authors = [...authorBySlug.values()];

  const categories = catalog.categories.map((c) => ({
    ...c,
    count: novels.filter((n) => n.cats.includes(c.slug)).length,
  }));

  const finalMap = new Map(novels.map((n) => [n.slug, n]));
  const epsCount = (slugs: string[]) => slugs.reduce((s, x) => s + (finalMap.get(x)?.eps.length ?? 0), 0);
  const collections: Collection[] = [
    ...extras.playlists.map((p) => ({
      id: p.id,
      title: p.title,
      novels: p.novel_slugs,
      count: epsCount(p.novel_slugs),
      ytId: p.youtube_playlist_id,
    })),
    ...catalog.collections.map((c) => ({ ...c, ytId: c.ytId ?? c.id })),
  ];

  const byViews = [...novels].sort((a, b) => b.views - a.views);
  const byRecent = [...novels].sort((a, b) => b.recent - a.recent);
  const authorMap = new Map(authors.map((a) => [a.slug, a]));
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));

  const searchNovels = (q: string, list: Novel[] = byViews) => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (n) =>
        n.name.toLowerCase().includes(term) ||
        (n.author ?? "").toLowerCase().includes(term) ||
        (n.urdu ?? "").includes(q.trim()) ||
        n.eps.some((e) => e.t.toLowerCase().includes(term)),
    );
  };

  return {
    novels,
    byViews,
    byRecent,
    categories,
    authors,
    collections,
    totalNovels: novels.length,
    totalVideos: catalog.totalVideos + addedVideos,
    totalViews: novels.reduce((s, n) => s + n.views, 0),
    getNovel: (slug) => finalMap.get(slug),
    getAuthor: (slug) => authorMap.get(slug),
    getCategory: (slug) => categoryMap.get(slug),
    novelsOf: (slugs) => slugs.map((s) => finalMap.get(s)).filter((n): n is Novel => Boolean(n)),
    novelsInCategory: (slug) => byViews.filter((n) => n.cats.includes(slug)),
    searchNovels,
    isCustomNovel: (slug) => customSlugs.has(slug),
  };
}

const cache = new WeakMap<LibraryExtras, Library>();

export function getLibrary(extras: LibraryExtras | undefined): Library {
  const key = extras ?? EMPTY_EXTRAS;
  let lib = cache.get(key);
  if (!lib) {
    lib = buildLibrary(key);
    cache.set(key, lib);
  }
  return lib;
}

const rootApi = getRouteApi("__root__");

/** The full library (channel catalog + owner additions) for use inside components. */
export function useLibrary(): Library {
  const { libraryExtras } = rootApi.useRouteContext();
  return getLibrary(libraryExtras);
}

import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { FeedVideo } from "./youtube";
import { EMPTY_EXTRAS, LIBRARY_EXTRAS_KEY, slugify, type LibraryExtras } from "./library";

/** Owner-only writes for the library tables (RLS lets only admins write). */

/** Turns a novel name into a free web address part: "man-yaram", then "man-yaram-2", ... */
export function uniqueSlug(name: string, taken: (slug: string) => boolean): string {
  const base = slugify(name);
  if (!base) throw new Error("Please type a novel name in English letters.");
  if (!taken(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const s = `${base}-${i}`;
    if (!taken(s)) return s;
  }
  throw new Error("Please choose a different name.");
}

/** New-uploads list: only full videos (no Shorts) that aren't in the library yet. */
export function pendingUploads(feed: FeedVideo[], inLibrary: (videoId: string) => boolean): FeedVideo[] {
  return feed.filter((v) => !v.isShort && !inLibrary(v.id));
}

export async function addLibraryNovel(input: {
  slug: string;
  name: string;
  urdu: string;
  author: string;
  categories: string[];
  format: "series" | "complete";
  playlistId: string | null;
}) {
  const { error } = await supabase.from("library_novels").insert({
    slug: input.slug,
    name: input.name.trim(),
    urdu: input.urdu.trim() || null,
    author: input.author.trim() || null,
    categories: input.categories,
    format: input.format,
    playlist_id: input.playlistId,
  });
  if (error) throw new Error(error.code === "23505" ? "A novel with this name already exists." : "Could not save the novel.");
}

export async function deleteLibraryNovel(slug: string) {
  const { error } = await supabase.from("library_novels").delete().eq("slug", slug);
  if (error) throw new Error("Could not remove the novel.");
}

export async function addLibraryVideo(input: {
  videoId: string;
  novelSlug: string;
  title: string;
  episode: number | null;
  season: number | null;
  minutes: number | null;
}) {
  const { error } = await supabase.from("library_videos").insert({
    video_id: input.videoId,
    novel_slug: input.novelSlug,
    title: input.title.trim(),
    episode: input.episode,
    season: input.season,
    duration: Math.max(0, Math.round((input.minutes ?? 0) * 60)),
  });
  if (error) throw new Error(error.code === "23505" ? "This video is already in that novel." : "Could not save the video.");
}

export async function deleteLibraryVideo(id: string) {
  const { error } = await supabase.from("library_videos").delete().eq("id", id);
  if (error) throw new Error("Could not remove the video.");
}

export async function addLibraryPlaylist(input: { title: string; youtubePlaylistId: string | null; novelSlugs: string[] }) {
  const { error } = await supabase.from("library_playlists").insert({
    title: input.title.trim(),
    youtube_playlist_id: input.youtubePlaylistId,
    novel_slugs: input.novelSlugs,
  });
  if (error) throw new Error("Could not save the playlist.");
}

export async function deleteLibraryPlaylist(id: string) {
  const { error } = await supabase.from("library_playlists").delete().eq("id", id);
  if (error) throw new Error("Could not remove the playlist.");
}

const rootApi = getRouteApi("__root__");

/** The owner's own additions (as loaded for the whole site). */
export function useLibraryExtras(): LibraryExtras {
  return rootApi.useRouteContext().libraryExtras ?? EMPTY_EXTRAS;
}

/** Reloads the library everywhere after the owner changes it. */
export function useRefreshLibrary() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    await qc.invalidateQueries({ queryKey: LIBRARY_EXTRAS_KEY });
    await router.invalidate();
  };
}

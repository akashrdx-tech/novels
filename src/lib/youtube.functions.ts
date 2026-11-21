import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseChannelFeed, type FeedVideo } from "./youtube";

/**
 * Public, read-only YouTube lookups for the admin portal. They only fetch YouTube's own public
 * feed/oEmbed (the browser can't, because of CORS) and never touch the database.
 */

export const getChannelUploads = createServerFn({ method: "GET" })
  .inputValidator(z.object({ channelId: z.string().regex(/^UC[A-Za-z0-9_-]{22}$/) }))
  .handler(async ({ data }): Promise<FeedVideo[]> => {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${data.channelId}`);
    if (!res.ok) throw new Error("YouTube did not answer. Please try again.");
    return parseChannelFeed(await res.text());
  });

export const getVideoInfo = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }))
  .handler(async ({ data }) => {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${data.id}`)}`,
    );
    if (!res.ok) return { found: false as const, title: "", channel: "" };
    const json = (await res.json()) as { title?: string; author_name?: string };
    return { found: true as const, title: String(json.title ?? "").slice(0, 300), channel: String(json.author_name ?? "") };
  });

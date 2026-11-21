import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatKind = "view" | "pdf_read" | "pdf_download";

export const statsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["novel-stats", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_novel_stats", { _slug: slug });
      if (error) throw error;
      return data?.[0] ?? { views: 0, pdf_reads: 0, pdf_downloads: 0 };
    },
  });

export const ratingQuery = (slug: string) =>
  queryOptions({
    queryKey: ["novel-rating", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_novel_rating", { _slug: slug });
      if (error) throw error;
      const row = data?.[0];
      return { avg: Number(row?.avg_rating ?? 0), count: row?.rating_count ?? 0 };
    },
  });

export const reviewsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["reviews", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_novel_reviews", { _slug: slug });
      if (error) throw error;
      return data ?? [];
    },
  });

export const latestReviewsQuery = () =>
  queryOptions({
    queryKey: ["reviews", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_latest_reviews");
      if (error) throw error;
      return data ?? [];
    },
  });

export const pdfListQuery = () =>
  queryOptions({
    queryKey: ["novel-pdf", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_novel_pdfs");
      if (error) throw error;
      return data ?? [];
    },
  });

export const pdfQuery = (slug: string) =>
  queryOptions({
    ...pdfListQuery(),
    select: (rows: Awaited<ReturnType<NonNullable<ReturnType<typeof pdfListQuery>["queryFn"]>>>) =>
      rows.find((r) => r.novel_slug === slug) ?? null,
  });

export async function bumpStat(slug: string, kind: StatKind) {
  const { error } = await supabase.rpc("bump_stat", { _slug: slug, _kind: kind });
  if (error) console.warn("stat not counted", error.message);
}

/** Where an uploaded PDF lives in the private bucket (the admin page always stores it here). */
export const pdfPathFor = (slug: string) => `${slug}.pdf`;

/**
 * Short-lived (10 minute) link to a library PDF. The bucket is private; visitors may sign links
 * only for PDFs registered in the library, so this works on any host without a server key.
 */
export async function pdfUrl(slug: string, download: boolean) {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) throw new Error("No PDF for this novel.");
  const { data, error } = await supabase.storage
    .from("novel-pdfs")
    .createSignedUrl(pdfPathFor(slug), 60 * 10, download ? { download: `${slug}.pdf` } : undefined);
  if (error || !data?.signedUrl) throw new Error("No PDF for this novel.");
  return data.signedUrl;
}

export async function addReview(input: {
  slug: string;
  name: string;
  rating: number;
  comment: string;
}) {
  const { error } = await supabase.from("reviews").insert({
    novel_slug: input.slug,
    name: input.name.trim().slice(0, 60),
    rating: input.rating,
    comment: input.comment.trim().slice(0, 1000),
  });
  if (error) throw error;
}

export async function sendFeedback(input: { name: string; contact: string; message: string }) {
  const { error } = await supabase.from("feedback").insert({
    name: input.name.trim().slice(0, 80),
    contact: input.contact.trim().slice(0, 120),
    message: input.message.trim().slice(0, 2000),
  });
  if (error) throw error;
}

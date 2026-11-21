import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPdfListQuery, removeNovelPdf, uploadNovelPdf } from "@/lib/admin";
import { useLibrary } from "@/lib/library";

export function PdfPanel() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { data: pdfs } = useQuery(adminPdfListQuery());
  const [q, setQ] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const list = lib.searchNovels(q, lib.byViews).slice(0, 30);
  const pdfMap = new Map((pdfs ?? []).map((p) => [p.novel_slug, p]));

  const upload = async (slug: string, file: File | undefined) => {
    if (!file) return;
    setBusySlug(slug);
    try {
      await uploadNovelPdf(slug, file);
      toast.success("PDF uploaded.");
      await qc.invalidateQueries({ queryKey: ["novel-pdf"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusySlug(null);
    }
  };

  const remove = async (slug: string, path: string) => {
    setBusySlug(slug);
    try {
      await removeNovelPdf(slug, path);
      toast.success("PDF removed.");
      await qc.invalidateQueries({ queryKey: ["novel-pdf"] });
    } catch {
      toast.error("Could not remove the PDF.");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search novel…" aria-label="Search novel" className="h-11" />
      <ul className="mt-6 space-y-3">
        {list.map((n) => {
          const pdf = pdfMap.get(n.slug);
          return (
            <li key={n.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <span className="min-w-0">
                <span className="block font-medium">{n.name}</span>
                <span className="block text-xs text-muted-foreground">{pdf ? "PDF uploaded" : "No PDF yet"}{n.author ? ` · ${n.author}` : ""}</span>
              </span>
              <span className="flex gap-2">
                <label className="cursor-pointer rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  {busySlug === n.slug ? "Working…" : pdf ? "Replace PDF" : "Upload PDF"}
                  <input type="file" accept="application/pdf" className="sr-only" disabled={busySlug !== null} onChange={(e) => void upload(n.slug, e.target.files?.[0])} />
                </label>
                {pdf && (
                  <Button size="sm" variant="glass" disabled={busySlug !== null} onClick={() => void remove(n.slug, pdf.file_path)}>Remove</Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

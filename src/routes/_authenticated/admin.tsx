import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NovelsPanel } from "@/components/admin/NovelsPanel";
import { PdfPanel } from "@/components/admin/PdfPanel";
import { PlaylistsPanel } from "@/components/admin/PlaylistsPanel";
import { UploadsPanel } from "@/components/admin/UploadsPanel";
import { VideosPanel } from "@/components/admin/VideosPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { isAdminQuery } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Novels Forever" },
      { name: "description", content: "Add novels, videos, playlists and PDFs to Novels Forever." },
      { property: "og:title", content: "Admin Portal — Novels Forever" },
      { property: "og:description", content: "Owner area for managing the Novels Forever library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const displayName = (email: string | undefined) =>
  email?.endsWith("@novelsforever.app") ? email.split("@")[0] : email;

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery(user.id));
  const [tab, setTab] = useState("uploads");
  const [videoPrefill, setVideoPrefill] = useState<{ link: string; novel: string | null; n: number }>({ link: "", novel: null, n: 0 });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const openVideo = (link: string, novel: string | null) => {
    setVideoPrefill((p) => ({ link, novel, n: p.n + 1 }));
    setTab("videos");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Owner area</p>
          <h1 className="mt-1 font-display text-4xl font-semibold">Admin portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {displayName(user.email)}</p>
        </div>
        <Button variant="glass" onClick={() => void signOut()}>Sign out</Button>
      </div>
      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Checking access…</p>
      ) : !isAdmin ? (
        <p className="mt-8 rounded-2xl border border-border bg-card-grad p-6 text-muted-foreground">
          This account is not an admin yet. Ask for admin access to be given to {user.email}.
        </p>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="uploads">New on YouTube</TabsTrigger>
            <TabsTrigger value="novels">Novels</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="pdfs">PDFs</TabsTrigger>
          </TabsList>
          <TabsContent value="uploads" className="mt-6">
            <UploadsPanel onAdd={(id) => openVideo(`https://www.youtube.com/watch?v=${id}`, null)} />
          </TabsContent>
          <TabsContent value="novels" className="mt-6">
            <NovelsPanel onAdded={(slug) => openVideo("", slug)} />
          </TabsContent>
          <TabsContent value="videos" className="mt-6">
            <VideosPanel key={videoPrefill.n} initialLink={videoPrefill.link} initialNovel={videoPrefill.novel} />
          </TabsContent>
          <TabsContent value="playlists" className="mt-6">
            <PlaylistsPanel />
          </TabsContent>
          <TabsContent value="pdfs" className="mt-6">
            <PdfPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

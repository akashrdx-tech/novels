<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The novel library comes from the static `src/data/catalog.json` (via `src/lib/catalog.ts`) merged with the owner's admin additions (`library_novels`, `library_videos`, `library_playlists`) in `src/lib/library.ts`; pages read it through `useLibrary()` — keeps pages fast and SSR-friendly while the owner can add content without code. In the catalog, a higher `recent` means a newer upload.
- Novel PDFs live in a private storage bucket and are opened through short-lived signed links — public buckets are blocked on this project.
- Reader "login" is a name stored in the browser only, not a real account; admin rights come solely from the `user_roles` table.
- Visitors read community data only through bounded database functions (one novel's reviews/stats/rating, latest reviews, PDF list without file paths); direct table reads are admin-only — keeps every public read limited to what a page shows.
- PDF links for visitors are signed in the browser (`pdfUrl` in `src/lib/community.ts`); storage lets visitors read only PDFs registered in `novel_pdfs`, and uploads always use `<slug>.pdf` — works on any host (Lovable or Vercel) without a server key.
- Media the site needs on every host (narrator photo, welcome voice) lives in `public/media/`, not in Lovable asset pointers — those only resolve on Lovable hosting.
- Admin YouTube lookups (latest channel uploads, video title from a link) go through public server functions in `src/lib/youtube.functions.ts` that only fetch YouTube's public feed/oEmbed — the browser can't call YouTube directly (CORS).

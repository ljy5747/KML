# KML bandwidth reduction

KML keeps its existing Supabase project and BeetleLog sync triggers. Apply `docs/egress-sync.sql` before deploying the client bundle.

The first authenticated load reads records in stable 500-row pages. Later refreshes send the current per-table signatures to `kml_sync_manifest`. An unchanged response contains only six hashes. For changed adult, line, or larva tables, the manifest includes IDs and `updated_at` values; only new/edited rows are downloaded, and missing IDs remove deleted records. Profiles (including public breeder labels), comments, and transfer history reload only when their content hash changes.

Snapshots live only in browser memory, are scoped to account and role, and are reset on logout. Refresh requests are serialized; all reads must succeed before the snapshot and rendered database are replaced. RLS and the existing approved-member check apply to the manifest; it runs with invoker permissions and is not callable anonymously.

Background polling runs every 30 seconds and pauses while the document is hidden or records are being edited. Focus/resume checks for changes, subject to the existing three-second debounce. Saves, imports, and accepted transfers immediately refresh through the same delta path. Inbox/reaction polling also runs every 30 seconds; explicit user actions retain their immediate updates.

This reduces future KML downloads. Initial loads, changed photos, BeetleLog's own client traffic, and other apps on the shared project still count toward Supabase usage. Compare the Usage Dashboard over subsequent days; database JSON sizes are not a measurement of billed monthly egress.

Validation: `node tests/remote-sync.cjs`; database permission/delta checks in `tests/remote-sync-db.sql` run inside a rollback transaction.

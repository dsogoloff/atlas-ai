import { UtmCapture } from "@/components/marketing/utm-capture";

export default function ChildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ATLAS-006 — NO THIRD-PARTY ANALYTICS ON CHILD SURFACES.

          This deliberately does NOT mount the analytics island. GA4 used to
          load here (the Meta Pixel never did); #210 redacted the child id out
          of page_location, but the tag still initialised and beaconed while a
          child was answering items. The pilot posture is that no third-party
          tag is present at all on a child screen — so the mount is gone rather
          than configured.

          Do not "restore" the island here. marketing-analytics.test.ts walks
          the import graph of this whole segment and fails if any third-party
          tag becomes reachable, and src/lib/marketing/child-surface.ts
          documents the two other halves of the boundary: entry into the
          assessment is a hard navigation, and track.ts refuses to use the
          global tag on these paths.

          UtmCapture stays: it is FIRST-PARTY — it reads the query string and
          writes our own cookie, makes no network request, and contacts no
          third party. Keeping it preserves attribution continuity for a parent
          who lands deep; dropping it would change marketing behaviour, which
          this change is not about.

          Conversion events raised on this route (assessment_start, at the
          parent handoff) are queued by track.ts and flushed from the next
          parent surface — the same deferral the Meta half has always used
          here, so no product signal is lost. */}
      <UtmCapture />
      {children}
    </>
  );
}

import { MarketingAnalytics } from "@/components/marketing/marketing-analytics";

export default function ChildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* CHILD-FACING: GA4 measurement + UTM continuity only. NO `pixel` prop —
          no advertising pixel loads while a child is answering items. Meta
          events raised here are queued and flushed from a parent surface. */}
      <MarketingAnalytics />
      {children}
    </>
  );
}

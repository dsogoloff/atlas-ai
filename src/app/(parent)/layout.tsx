import { MarketingAnalytics } from "@/components/marketing/marketing-analytics";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Parent-facing surface (dashboard / report): GA4 + UTM + Pixel. This is
          where assessment_complete fires and where the deferred Meta queue is
          drained. */}
      <MarketingAnalytics pixel />
      {children}
    </>
  );
}

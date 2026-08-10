import { MarketingAnalytics } from "@/components/marketing/marketing-analytics";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Parent-facing surface: GA4 + UTM capture + Meta Pixel. */}
      <MarketingAnalytics pixel />
      {children}
    </>
  );
}

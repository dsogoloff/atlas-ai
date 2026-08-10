import { MarketingAnalytics } from "@/components/marketing/marketing-analytics";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Parent-facing surface (signup / login / consent): GA4 + UTM + Pixel. */}
      <MarketingAnalytics pixel />
      {children}
    </>
  );
}

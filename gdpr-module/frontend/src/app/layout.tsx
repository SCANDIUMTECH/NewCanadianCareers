import type { Metadata } from "next";
import { GDPRProvider } from "@/components/gdpr";
import { CookieBanner } from "@/components/gdpr";
import { PrivacySettingsModal } from "@/components/gdpr";
import { PrivacySettingsTrigger } from "@/components/gdpr";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDPR Module",
  description: "GDPR Compliance Module",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GDPRProvider version="1.0.0">
          {children}
          <CookieBanner />
          <PrivacySettingsModal />
          <PrivacySettingsTrigger />
        </GDPRProvider>
      </body>
    </html>
  );
}

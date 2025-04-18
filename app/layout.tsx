import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import AuthWrapper from "@/components/auth/AuthWrapper";
import Reload from "@/components/Reload";
import { NotificationProvider } from "@/contexts/NotificationContext";
import QueryProvider from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UMS POS",
  description: "UMS POS",
  manifest: "/manifest.json",
  icons: {
    icon: "/favi.png",
    apple: "/favi.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000080" },
    { media: "(prefers-color-scheme: dark)", color: "#000080" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>
          <QueryProvider>
            <NotificationProvider>
              <AuthWrapper>
                {children}
                <Toaster />
                <Reload />
              </AuthWrapper>
            </NotificationProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

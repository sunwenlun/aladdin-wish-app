import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { Navigation } from "@/components/Navigation";
import { NotificationManager } from "@/components/NotificationManager";
import { AuthProvider } from "@/lib/useAuth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Aladdin's Wish Lamp",
  description: "Make your wish and let it travel the world. The genie grants you 3 wishes.",
  manifest: "/manifest.json",
  icons: {
    icon: "/genie-lamp-icon.png",
    shortcut: "/genie-lamp-icon.png",
    apple: "/genie-lamp-icon.png",
  },
  openGraph: {
    title: "Aladdin's Wish Lamp",
    description: "Make your wish and let it travel the world. The genie grants you 3 wishes.",
    images: [
      {
        url: "/genie-lamp-icon.png",
        width: 1024,
        height: 1024,
        alt: "Aladdin's Wish Lamp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aladdin's Wish Lamp",
    description: "Make your wish and let it travel the world. The genie grants you 3 wishes.",
    images: ["/genie-lamp-icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0a1a] starry-bg">
        <I18nProvider>
          <AuthProvider>
            <main className="max-w-md mx-auto min-h-screen pb-24">
              {children}
            </main>
            <Navigation />
            <NotificationManager />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

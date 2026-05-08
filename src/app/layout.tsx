import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WatchMe.log - Track Your Shows & Movies",
  description: "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log. Kelola daftar tontonan dengan mudah.",
  keywords: ["watchme log", "watchme.log", "movie tracker", "series tracker", "track shows", "movie list", "daftar tontonan", "tv shows progress"],
  authors: [{ name: "taqy" }],
  robots: "index, follow",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://watchme-log.vercel.app/",
    title: "WatchMe.log - Track Your Shows & Movies",
    description: "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WatchMe.log",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchMe.log - Track Your Shows & Movies",
    description: "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log.",
    images: ["/og-image.png"],
  },
  other: {
    "google-site-verification": "CtKabgz4N2_NiMCQ74QNaLx6QFZhGUfvUuIcyk03IKc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

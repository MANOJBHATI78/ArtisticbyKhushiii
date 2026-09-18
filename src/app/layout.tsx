import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Artistic by Khushiii | Handcrafted Personalized Resin Art & Gifts",
    template: "%s | Artistic by Khushiii",
  },
  description:
    "Discover handcrafted resin nameplates, wall art, trays, coasters, keychains, jewellery and memory preservation keepsakes by Artistic by Khushiii. Personalized designs made with love. Enquire on WhatsApp.",
  keywords: [
    "resin art", "personalized resin nameplate", "resin nameplate India", "memory preservation",
    "resin gifts", "handcrafted resin art", "Lippan art", "custom resin art", "resin coasters", "resin tray",
  ],
  authors: [{ name: "Khushi" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo.png", type: "image/png" },
    ],
    apple: "/images/apple-touch-icon.png",
  },
  openGraph: {
    title: "Artistic by Khushiii | Handcrafted Personalized Resin Art & Gifts",
    description:
      "Premium handcrafted resin art — personalized nameplates, décor, memory keepsakes and custom gifts, made to order with love. Surat studio, pan-India delivery & worldwide shipping.",
    siteName: "Artistic by Khushiii",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${jost.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Europe + Turkey 2026",
  description:
    "Melbourne → Europe → London → Turkey, 9 Sep – 28 Oct 2026. Day-by-day itinerary, where to sleep each night, and a booking checklist.",
};

export const viewport: Viewport = {
  themeColor: "#07111e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { AssistWidget } from "@wayfinder/adapter-nextjs/react";

export const metadata: Metadata = {
  title: "Donor Assist Demo",
  description: "Wayfinder AI Assist Demo",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <AssistWidget endpoint="/api/assist/chat" />
      </body>
    </html>
  );
}

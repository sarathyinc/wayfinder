import type { Metadata } from "next";
import "./globals.css";
import { AssistWidget } from "@wayfinder/adapter-nextjs/react";

export const metadata: Metadata = {
  title: "Donor Assist Demo",
  description: "Wayfinder AI Assist Demo",
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

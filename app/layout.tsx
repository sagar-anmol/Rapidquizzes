import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Current Affairs Quiz",
  description: "Offline-ready quiz practice with admin-managed question sets"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

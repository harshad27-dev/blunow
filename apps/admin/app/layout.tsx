import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blunow Admin",
  description: "Moderation and Administration Dashboard for Blunow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

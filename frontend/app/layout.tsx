import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Equity Investment Tracker",
  description:
    "Track mutual funds and direct equities in one unified portfolio with institutional-grade analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

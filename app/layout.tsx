import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "SlideMaker — AI Presentation Agent",
  description: "Create presentations with AI - PowerPoint and web decks from a single prompt",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

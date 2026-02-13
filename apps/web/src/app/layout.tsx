import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RoamNY — Walk NYC Through Video",
  description:
    "Drag and drop to explore NYC walking tour videos synced to an interactive map.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-roam-dark text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

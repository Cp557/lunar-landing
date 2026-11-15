import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Lunar Landing Site Navigator",
  description:
    "If we land here, on this date, how long will we have sunlight and contact with Earth? NASA Space Apps 2026.",
  icons: { icon: "/lander.svg" }, // "Lander Galaxy" by SVG Repo, CC0
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark h-full font-sans antialiased", outfit.variable)}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

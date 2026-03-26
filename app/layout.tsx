import type { Metadata } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { AgentationDev } from "@/components/agentation-dev";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const fontSans = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const fontMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "hired.ai",
  description: "Hiring platform with Better Auth and organizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} min-h-full flex flex-col antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
            <AgentationDev />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

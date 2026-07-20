import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "GroupCup: Predict the World Cup with your group chat",
  description:
    "Turn any Telegram group chat into a World Cup prediction league. Free to play, no sign up, works in any group.",
  applicationName: "GroupCup",
  openGraph: {
    title: "GroupCup: Predict the World Cup with your group chat",
    description:
      "Turn any Telegram group chat into a World Cup prediction league. Free to play, no sign up, works in any group.",
    siteName: "GroupCup",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1122" },
  ],
};

/** Runs before paint: apply the saved theme, else the OS preference. */
const THEME_INIT = `try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable} suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}

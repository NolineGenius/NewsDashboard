import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { ProfileProvider } from "@/contexts/profile-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NewsDash - News Dashboard & LinkedIn Content Tool",
  description:
    "Aggregiere News, generiere LinkedIn-Beiträge und monitore Kanäle mit KI-Unterstützung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

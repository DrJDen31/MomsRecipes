import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { TagProvider } from "@/context/TagContext";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mom's Recipes | A Collection of Love & Spice",
  description: "A digital cookbook of our family's favorite recipes.",
};

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TagProvider>
          <Navbar user={user} />
          <main style={{ minHeight: 'calc(100vh - 200px)' }}>
            {children}
          </main>
          <Footer />
        </TagProvider>
      </body>
    </html>
  );
}

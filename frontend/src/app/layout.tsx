import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { geistMono, geistSans } from "@/lib/font";
import ReduxStoreProvider from "@/context/ReduxStoreProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { cn } from "cn";
import { AuthProvider } from "@/context/AuthContext";
import { getSession } from "@/lib/jwt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Test Tecnico Datapizza - Marco Giovanniello",
  description:
    "Test tecnico per la posizione di Frontend Software Engineer presso Datapizza",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html
      lang="it"
      className={cn(
        "h-full antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
      )}
      suppressHydrationWarning
    >
      <head></head>

      <body className="min-h-full">
        <AuthProvider
          auth={session || false}
          key={session?.user_id || undefined}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { geistMono, geistSans } from "@/lib/font";
import ReduxStoreProvider from "@/context/ReduxStoreProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { cn } from "cn";
import { AuthProvider } from "@/context/AuthContext";
import { getSession } from "@/lib/jwt";
import { Suspense, type ReactNode } from "react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Consente a env(safe-area-inset-*) di funzionare sui telefoni con notch e
  // fa ridurre il layout con la tastiera a schermo, così l'input resta visibile.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Test Tecnico Datapizza - Marco Giovanniello",
  description:
    "Test tecnico per la posizione di Frontend Software Engineer presso Datapizza",
};

// La sessione viene letta dai cookie a runtime, quindi deve stare dietro un
// confine Suspense per mantenere prerenderizzabile il layout radice.
async function SessionProviders({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  return (
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
  );
}

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
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
        <Suspense fallback={null}>
          <SessionProviders>{children}</SessionProviders>
        </Suspense>
      </body>
    </html>
  );
}

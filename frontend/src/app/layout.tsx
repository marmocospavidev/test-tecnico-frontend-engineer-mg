import type { Metadata } from "next";
import "@/styles/globals.css";
import { geistMono, geistSans } from "@/lib/font";

export const metadata: Metadata = {
  title: "Test Tecnico Datapizza - Marco Giovanniello",
  description:
    "Test tecnico per la posizione di Frontend Software Engineer presso Datapizza",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

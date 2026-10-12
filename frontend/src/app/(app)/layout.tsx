import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatProvider } from "@/context/ChatContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <div className="w-full min-h-svh relative z-0">
          <AppHeader />
          <main className="relative z-0 w-full h-screen">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ChatProvider>
  );
}

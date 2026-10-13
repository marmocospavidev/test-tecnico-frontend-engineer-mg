import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatProvider } from "@/context/ChatContext";
import ReduxStoreProvider from "@/context/ReduxStoreProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReduxStoreProvider>
      <ChatProvider>
        <SidebarProvider
          defaultOpen={false}
          className="h-dvh min-h-0 overflow-hidden"
        >
          <AppSidebar />
          {/* dvh segue il viewport realmente visibile su mobile, così l'input non finisce mai sotto la piega. */}
          <div className="relative z-0 flex h-dvh w-full min-w-0 flex-col">
            <AppHeader />
            <main className="relative z-0 min-h-0 w-full flex-1">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </ChatProvider>
    </ReduxStoreProvider>
  );
}

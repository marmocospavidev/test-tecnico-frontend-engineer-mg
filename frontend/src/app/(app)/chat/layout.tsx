import { ChatRouteSync } from "@/components/chat/ChatRouteSync";
import { ChatView } from "@/components/chat/ChatView";
import { Suspense } from "react";

// L'interfaccia della chat vive nel layout, così sopravvive alla navigazione
// tra /chat e /chat/[chatId] (ad esempio subito dopo la creazione di una
// nuova chat). Le pagine scelgono solo quale conversazione è aperta.
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ChatView />
      <Suspense fallback={null}>
        <ChatRouteSync />
      </Suspense>
      {children}
    </>
  );
}

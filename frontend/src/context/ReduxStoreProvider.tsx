"use client";

import { AppStore, makeStore } from "@/store/store";
import { useState } from "react";
import { Provider } from "react-redux";

function ReduxStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store] = useState<AppStore>(makeStore);

  return <Provider store={store}>{children}</Provider>;
}

export default ReduxStoreProvider;

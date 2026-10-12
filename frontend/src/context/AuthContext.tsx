"use client";

import { Session } from "@/lib/actions/auth";
import { createContext, useContext, useState } from "react";

type AuthContextType = Session | false;

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context && context !== false) {
    throw new Error(
      "useAuth must be used within an AuthProvider",
    );
  }
  return context;
};

export function AuthProvider({
  children,
  auth,
}: {
  children: React.ReactNode;
  auth: Session | false;
}) {
  const [authState] = useState<Session | false>(auth);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

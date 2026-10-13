"use server";

import { FieldErrors } from "react-hook-form";

import {
  LoginSchema,
  TLoginSchema,
} from "../schemas/LoginSchema";
import { createSession, deleteSession } from "../jwt";
import { ZodParser } from "../schemas/parser";
import { login } from "../api";
import { redirect } from "next/navigation";

export interface Session {
  user_id: string;
  remember: boolean;
  timestamp: number;
}

interface LoginSuccess {
  success: true;
  formErrors?: never;
  message?: string;
}

interface LoginFailure {
  success: false;
  formErrors?: FieldErrors<TLoginSchema>;
  message?: string;
}

type LoginState = LoginSuccess | LoginFailure;

export async function act_Login(
  previousState: LoginState | null,
  data: TLoginSchema,
): Promise<LoginState | null> {
  const parsed = ZodParser(data, LoginSchema);

  if (!parsed.success) {
    return {
      success: false,
      formErrors: parsed.result,
    };
  }
  const { user_id, remember } = parsed.result;
  const result = await login(user_id, remember);
  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  await createSession(
    { user_id: result.data.user_id },
    result.data.remember,
  );

  redirect("/chat");
}


export async function act_Logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}

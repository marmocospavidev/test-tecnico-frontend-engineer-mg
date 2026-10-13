"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  LoginSchema,
  TLoginSchema,
} from "@/lib/schemas/LoginSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { DicesIcon } from "lucide-react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { act_Login } from "@/lib/actions/auth";
import {
  startTransition,
  useActionState,
  useEffect,
} from "react";
import { generateRandomUsername } from "@/lib/utils";

function Home() {
  const [loginState, LOGIN, isLoginPending] =
    useActionState(act_Login, null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
    trigger,
    clearErrors,
    setError,
    getValues,
    setValue,
  } = useForm<TLoginSchema>({
    resolver: zodResolver(LoginSchema),
    mode: "onChange",
    defaultValues: {
      user_id: "",
      remember: false,
    },
  });

  const onSubmit = async (data: TLoginSchema) => {
    startTransition(() => {
      LOGIN(data);
    });
  };

  useEffect(() => {
    if (loginState && loginState.formErrors) {
      Object.entries(loginState.formErrors).forEach(
        ([key, value]) => {
          setError(key as keyof TLoginSchema, {
            type: (value.type as string) || "manual",
            message: value.message || "",
          });
        },
      );
    }
  }, [loginState]);

  return (
    <main className="w-full min-h-dvh flex justify-center">
      <div className="w-full grow lg:w-[50%] lg:max-w-md flex flex-col justify-center items-center gap-4">
        <Card
          size="default"
          className="w-full h-full md:h-auto rounded-none md:rounded-xl justify-center"
        >
          <CardHeader className="grid-rows-3">
            <Image
              src="/LogoFull.png"
              alt=""
              width={3800}
              height={1149}
              className="w-full justify-self-center col-span-full dark:mb-3 dark:rounded-lg dark:bg-white dark:p-3"
            />
            <CardTitle className="row-start-2">
              Login
            </CardTitle>
            <CardDescription className="row-start-3">
              Inserisci il tuo username per accedere o
              generane uno random con il pulsante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="login-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <FieldSet>
                <Controller
                  name="user_id"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                    >
                      <InputGroup>
                        <InputGroupInput
                          {...field}
                          id={field.name}
                          disabled={isLoginPending}
                          type="text"
                          placeholder="Inserisci il tuo username"
                          required
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                        <InputGroupAddon align="inline-end">
                          <Button
                            disabled={isLoginPending}
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => {
                              setValue(
                                "user_id",
                                generateRandomUsername(),
                                { shouldValidate: true },
                              );
                            }}
                          >
                            <DicesIcon />
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      {fieldState.invalid && (
                        <FieldError
                          errors={[fieldState.error]}
                        />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="remember"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      orientation="horizontal"
                    >
                      <Switch
                        disabled={isLoginPending}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        ref={field.ref}
                      />
                      <Label htmlFor="airplane-mode">
                        Ricordami
                      </Label>
                      {fieldState.invalid && (
                        <FieldError
                          errors={[fieldState.error]}
                        />
                      )}
                    </Field>
                  )}
                />
              </FieldSet>
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              type="submit"
              form="login-form"
              className="w-full"
            >
              Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default Home;

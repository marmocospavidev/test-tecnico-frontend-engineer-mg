import z from "zod";

export const LoginSchema = z.object({
  user_id: z
    .string()
    .nonempty({ message: "Lo username è obbligatorio" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Lo username può contenere solo lettere, numeri, '-' e '_'",
    })
    .max(
      100,
      "Lo username non può superare i 100 caratteri",
    ),
  remember: z.boolean(),
});

export type TLoginSchema = z.infer<typeof LoginSchema>;

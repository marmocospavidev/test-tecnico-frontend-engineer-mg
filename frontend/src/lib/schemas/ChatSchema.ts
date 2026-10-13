import z from "zod";

export const ChatSchema = z.object({
  query: z
    .string()
    .nonempty()
    .max(
      10000,
      "Il messaggio non può contenere piu di 10.000 caratteri",
    ),
});

export type TChatSchema = z.infer<typeof ChatSchema>;

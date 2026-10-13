import z from "zod";

export type ZodErrors = Record<
  string,
  { type: string; message: string }
>;

export type ZodParserResult<Output> =
  | { success: true; result: Output }
  | { success: false; result: ZodErrors };

export function ZodParser<Output, Input>(
  data: unknown,
  schema: z.ZodType<Output, Input>,
): ZodParserResult<Output> {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    const zodErrors = parsed.error.issues.reduce<ZodErrors>(
      (acc, issue) => {
        const fieldKey =
          issue.path[0]?.toString() ?? "root";

        acc[fieldKey] = {
          type: "server",
          message: issue.message,
        };

        return acc;
      },
      {},
    );

    return {
      success: false,
      result: zodErrors,
    };
  } else
    return {
      success: true,
      result: parsed.data,
    };
}

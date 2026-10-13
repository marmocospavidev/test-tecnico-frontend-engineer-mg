import z from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

const pdfFileSchema = z
  .file()
  .max(MAX_FILE_SIZE, "Il file non può superare i 10 MB")
  .mime(
    ["application/pdf"],
    "Sono consentiti solo file PDF",
  );

export const PDFSchema = z.object({
  files: z
    .array(pdfFileSchema)
    .min(1, "Seleziona almeno un PDF")
    .max(
      MAX_FILES,
      `Puoi caricare massimo ${MAX_FILES} file`,
    ),
});

export type TPDFSchema = z.infer<typeof PDFSchema>;

import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "success" | "info" | "destructive"> = {
  ingested: "success",
  processing: "info",
  pending: "info",
  failed: "destructive",
  error: "destructive",
};

// Il backend documenta solo "ingested"; gli altri valori ricadono sul neutro.
export function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "secondary"}>{status}</Badge>
  );
}

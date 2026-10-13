import { Loader2Icon } from "lucide-react"
import { cn } from "cn"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Caricamento"
      className={cn("size-4 animate-spin text-primary", className)}
      {...props}
    />
  )
}

export { Spinner }

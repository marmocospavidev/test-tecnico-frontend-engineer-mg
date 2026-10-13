import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
} from "lucide-react"
import { cn } from "cn"

// I messaggi di stato non si affidano mai al solo colore: ogni variante ha la
// propria icona e una superficie colorata, e il testo mantiene il colore di
// primo piano a pieno contrasto.
const alertVariants = cva(
  "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-sm",
  {
    variants: {
      variant: {
        error: "border-destructive/40 bg-destructive/10 [&>svg]:text-destructive",
        success: "border-success/40 bg-success/10 [&>svg]:text-success",
        warning: "border-warning/40 bg-warning/10 [&>svg]:text-warning",
        info: "border-info/40 bg-info/10 [&>svg]:text-info",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const icons = {
  error: AlertCircleIcon,
  success: CheckCircle2Icon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
} as const

function Alert({
  className,
  variant = "info",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const Icon = icons[variant ?? "info"]

  return (
    <div
      data-slot="alert"
      // Gli errori interrompono le tecnologie assistive, gli altri stati sono "polite".
      role={variant === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
    </div>
  )
}

export { Alert, alertVariants }

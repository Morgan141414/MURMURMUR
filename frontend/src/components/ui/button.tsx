import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[6px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        outline:
          "border-border bg-card text-foreground shadow-xs hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost:
          "text-text-secondary hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-[#b91c1c]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-[6px] px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-[6px] px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 rounded-[6px] px-5 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 rounded-[6px]",
        "icon-xs": "size-7 rounded-[6px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-[6px]",
        "icon-lg": "size-11 rounded-[6px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

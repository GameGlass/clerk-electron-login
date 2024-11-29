import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const alertVariants = cva(
	'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-8px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-[14px] [&>svg]:text-foreground [&>svg~*]:pl-7',
	{
		variants: {
			variant: {
				default: 'bg-background text-foreground',
				destructive: 'bg-destructive/10 border-destructive/70 text-destructive-foreground [&>svg]:text-destructive-foreground',
				warning: 'bg-warning/10 border-warning/70 text-warning-foreground [&>svg]:text-warning-foreground'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
)

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
	({ className, variant, ...props }, ref) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
	<h3 ref={ref} className={cn('mb-2 font-semibold leading-none tracking-normal text-md', className)} {...props} />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }

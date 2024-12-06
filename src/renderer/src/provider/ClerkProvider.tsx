import { dark } from '@clerk/themes'

import { ClerkProp, ClerkProvider, ClerkProviderProps } from '@clerk/clerk-react'
import { PropsWithChildren } from 'react'
import { router } from '@/src/app/router'
import { getClerkInstance } from '@/lib/clerk'

export const HubClerkProvider = ({ children }: PropsWithChildren) => {
	const clerkProps: Partial<ClerkProviderProps> = {
		publishableKey: `${import.meta.env.VITE_CLERK_PUBLIC_KEY}`,
		signInUrl: '/signin',
		signUpUrl: '/signup',
		afterSignOutUrl: '/signout',
		routerPush: (to: string) => router.navigate({ to }),
		routerReplace: (to: string) => router.navigate({ to }),
    allowedRedirectOrigins: ['clerk://local.hub.electron.vite'],
		appearance: {
			baseTheme: dark,
			layout: {
				socialButtonsPlacement: 'bottom',
				socialButtonsVariant: 'iconButton',
				helpPageUrl: 'https://support.example.com'
			},
			variables: {
				borderRadius: '0'
			}
		}
	}

	if (!import.meta.env.VITE_DOMAIN.match('http')) {
		clerkProps.Clerk = getClerkInstance({ publishableKey: import.meta.env.VITE_CLERK_PUBLIC_KEY }) as unknown as ClerkProp
	}

	return <ClerkProvider {...(clerkProps as ClerkProviderProps)}>{children}</ClerkProvider>
}


import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icons } from '@/components/ui/icons'
import * as z from 'zod'
import { FieldPath, useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { HTMLAttributes, useEffect, useState } from 'react'
import { useAuth, useSession, useSignIn } from '@clerk/clerk-react'
import { ClerkAPIError, OAuthStrategy } from '@clerk/types'
import { TwitchIcon } from 'lucide-react'
import { DiscordLogoIcon } from '@radix-ui/react-icons'
import { parseErrors } from '@/components/ui/SignUp/utils/ErrorHandler'
import { FancyButton } from '@/components/FancyButton'
import { Separator } from '@/components/ui/separator'
import { useOAuth } from '@/src/hooks/useOAuth'
import { useNavigate, Link } from '@tanstack/react-router'
import { router } from '@/src/app/router'

interface SignInTypes extends HTMLAttributes<HTMLDivElement> {}

interface SignInError {
	errors: ClerkAPIError[]
	clerkError: boolean
}

const FormSchema = z.object({
	emailAddress: z.string().email(),
	password: z.string().min(6, {
		message: 'Password must be at least 6 characters'
	})
})

type authFormValues = z.infer<typeof FormSchema>

const defaultValues: Partial<authFormValues> = {
	emailAddress: '',
	password: ''
}

export const SignInForm = ({ className, ...props }: SignInTypes) => {
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const { isLoaded, signIn, setActive } = useSignIn()
	const { signOut } = useAuth()
	const { session, isSignedIn } = useSession()
	const navigate = useNavigate()
	const { startOAuthFlow: googleOauthFlow } = useOAuth({ strategy: 'oauth_google' })

	const form = useForm<authFormValues>({
		resolver: zodResolver(FormSchema),
		defaultValues
	})

	useEffect(() => {
		if (session && isSignedIn) {
			void router.invalidate().then(() => {
				return navigate({ to: '/' })
			})
		}
	}, [isLoaded, session])

	function displayFormErrors(err: SignInError) {
		// This can return an array of errors.
		// See https://clerk.com/docs/custom-flows/error-handling to learn about error handling
		setIsLoading(false)

		const errors = err.errors as ClerkAPIError[]

		const parsedErrors = parseErrors(errors)

		parsedErrors.fieldErrors.forEach((fieldError) => {
			form.setError(fieldError.meta?.paramName as FieldPath<authFormValues>, fieldError)
		})

		parsedErrors.globalErrors.forEach((globalError) => {
			form.setError('root.globalError', globalError)
		})
	}

	const trySignIn = async (data: z.infer<typeof FormSchema>) => {
		const completeSignIn = await signIn?.create({
			identifier: data.emailAddress,
			password: data.password
		})

		if (completeSignIn?.status !== 'complete') {
			// The status can also be `needs_factor_on', 'needs_factor_two', or 'needs_identifier'
			// Please see https://clerk.com/docs/references/react/use-sign-in#result-status for  more information
			setIsLoading(false)
		}

		if (completeSignIn?.status === 'complete') {
			// If complete, user exists and provided password match -- set session active
			if (setActive) {
				await setActive({ session: completeSignIn.createdSessionId, redirectUrl: '/signin' })
			}
		}
	}

	const onSubmit = async (data: z.infer<typeof FormSchema>) => {
		setIsLoading(true)
		if (!isLoaded) {
			return
		}

		try {
			await trySignIn(data)
		} catch (err: unknown) {
			const clerkSignInError = err as SignInError
			if (clerkSignInError.clerkError) {
				for (const error of clerkSignInError.errors) {
					if (error.code === 'session_exists') {
						void signOut()
						await trySignIn(data)
					}
				}
			}

			displayFormErrors(clerkSignInError)
		}
	}

	const signInWith = (strategy: OAuthStrategy) => {
		if (signIn) {
			if (strategy === 'oauth_google') {
				try {
					googleOauthFlow({ redirectUrl: `${import.meta.env.VITE_HTTPS_DOMAIN}/sso-callback` })
				} catch (err: unknown) {
					displayFormErrors(err as SignInError)
				}
			}
		}
	}

	return (
		<>
			<div className="flex flex-col text-center mb-6">
				<h1 className="text-2xl text-center font-medium">Sign In</h1>
				<p className={`text-md text-muted-foreground`}>
					Don't have an account?{' '}
					<Link to="/signup" className="font-semibold text-accent hover:text-accent-foreground inline-flex items-center">
						Sign Up
					</Link>
				</p>
			</div>
			<div className={cn('grid', className)} {...props}>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
						{form.formState.errors.root?.globalError && (
							<p className={'text-sm font-normal text-destructive-foreground mt-1'}>{form.formState.errors.root?.globalError.message}</p>
						)}
						<FormField
							control={form.control}
							name="emailAddress"
							render={({ field }) => (
								<FormItem className="space-y-1">
									<FormLabel className="text-md font-normal">Email Address</FormLabel>
									<FormControl>
										<Input
											type="email"
											autoCapitalize="none"
											autoComplete="email"
											autoCorrect="off"
											autoFocus
											placeholder="your@email.com"
											className="bg-black/30 backdrop-blur border border-muted h-11 shadow-inner shadow-black/30 placeholder:text-muted-foreground/60 font-mono text-sm"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="space-y-1">
									<FormLabel className="text-md font-normal">Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="off"
											autoCapitalize="none"
											autoCorrect="off"
											placeholder="Password"
											className="bg-black/30 backdrop-blur border border-muted h-11 shadow-inner shadow-black/30 placeholder:text-muted-foreground/60 font-mono text-sm"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid">
							<FancyButton variant="hero" className="w-full gap-2 contain ggSmallCaps mb-4 mt-2" type="submit" disabled={isLoading}>
								{isLoading && <Icons.loaderSquare className="mr-2 h-4 w-4 float-left" />}
								Sign In
							</FancyButton>
						</div>
						<div className="relative grid grid-cols-4 text-xs ggSmallCaps items-center">
							<Separator className="col-span-1" />
							<div className="col-span-2 text-center align-center text-muted-foreground">Or continue with</div>
							<Separator className="grid col-span-1" />
						</div>
						<div className="grid grid-cols-3 gap-2">
							<Button variant="secondary" type="button" disabled={isLoading} onClick={() => signInWith('oauth_google')}>
								{isLoading ? <Icons.loaderSquare className="mr-2 h-4 w-4" /> : <Icons.google className="mr-2 h-4 w-4" />} Google
							</Button>
							<Button variant="secondary" type="button" disabled={isLoading} onClick={() => signInWith('oauth_twitch')}>
								{isLoading ? <Icons.loaderSquare className="mr-2 h-4 w-4" /> : <TwitchIcon className="mr-2 h-4 w-4" />} Twitch
							</Button>
							<Button variant="secondary" type="button" disabled={isLoading} onClick={() => signInWith('oauth_discord')}>
								{isLoading ? <Icons.loaderSquare className="mr-2 h-4 w-4" /> : <DiscordLogoIcon className="mr-2 h-4 w-4" />} Discord
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</>
	)
}

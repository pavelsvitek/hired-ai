import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-8 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create account
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Use an email at your firm’s domain to join the matching organization
        </p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

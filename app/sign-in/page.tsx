import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-8 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Email and password
        </p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        No account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

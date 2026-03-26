import { headers } from "next/headers";
import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";

import { ThemeToggle } from "@/components/theme-toggle";

import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizations = session
    ? await auth.api.listOrganizations({
      headers: await headers(),
    })
    : [];

  if (session) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-zinc-50 font-sans dark:bg-zinc-950">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                hired.ai
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Hi, {session.user.name}
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                You’re signed in with Better Auth and organizations support.
              </p>
            </div>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Your organizations
              </h2>
              {organizations.length ? (
                <ul className="mt-4 space-y-2">
                  {organizations.map((org) => (
                    <li
                      key={org.id}
                      className="rounded-lg border border-zinc-100 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                    >
                      <span className="font-medium">{org.name}</span>
                      <span className="ml-2 text-sm text-zinc-500">
                        ({org.slug})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  You’re not a member of any organization yet. Register with a
                  firm email domain, or ask an admin to invite you.
                </p>
              )}
            </section>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            hired.ai
          </span>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/sign-in"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Sign in to continue. Use an email at a configured firm domain to
            join that organization automatically when you register.
          </p>
        </div>
      </main>
    </div>
  );
}

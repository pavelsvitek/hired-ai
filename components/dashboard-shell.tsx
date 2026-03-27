import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function DashboardShell({
  organizationId,
  breadcrumb,
  headerAction,
  children,
}: {
  organizationId: string | null;
  breadcrumb: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider className="h-dvh max-h-dvh min-h-0 overflow-hidden">
      <AppSidebar organizationId={organizationId} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            {breadcrumb}
            {headerAction ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {headerAction}
              </div>
            ) : null}
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

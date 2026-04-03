"use client";

import Link from "next/link";

import { BriefcaseIcon, ChevronRightIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useJobsList } from "@/models/job/queries";
import { cn } from "@/lib/utils";

export function NavJobs({ organizationId = null }: { organizationId?: string | null }) {
  const { data: jobs = [], isLoading } = useJobsList(organizationId);

  if (organizationId == null || organizationId.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Jobs</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible asChild defaultOpen>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="All jobs">
              <Link href="/dashboard/jobs">
                <BriefcaseIcon />
                <span>All jobs</span>
              </Link>
            </SidebarMenuButton>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRightIcon />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {isLoading ? (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton className="pointer-events-none text-muted-foreground">
                      <span className="truncate text-xs">Loading…</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : (
                  jobs.map((job) => (
                    <SidebarMenuSubItem key={job.id}>
                      <SidebarMenuSubButton
                        asChild
                        className={cn(job.isDefault && "font-medium text-primary")}
                      >
                        <Link
                          href={`/dashboard/candidates?jobId=${encodeURIComponent(job.id)}&view=board`}
                          title={job.title}
                        >
                          <BriefcaseIcon className="opacity-70" />
                          <span className="truncate">{job.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                )}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}

"use client"

import { useTheme } from "next-themes"
import * as React from "react"

import { NavJobs } from "@/components/nav-jobs"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MoonIcon,
  SendIcon,
  Settings2Icon,
  SunIcon,
  TerminalIcon,
  UsersIcon,
} from "lucide-react"

function SidebarThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        size="sm"
        tooltip={
          mounted
            ? isDark
              ? "Switch to light theme"
              : "Switch to dark theme"
            : "Theme"
        }
        aria-label={
          mounted
            ? isDark
              ? "Switch to light theme"
              : "Switch to dark theme"
            : "Theme"
        }
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {mounted && isDark ? (
          <SunIcon />
        ) : (
          <MoonIcon />
        )}
        <span>Theme</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: false,
    },
    {
      title: "Settings",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: (
        <LifeBuoyIcon
        />
      ),
    },
    {
      title: "Feedback",
      url: "#",
      icon: (
        <SendIcon
        />
      ),
    },
  ],
  projects: [] as {
    name: string
    url: string
    icon: React.ReactNode
  }[],
}

export function AppSidebar({
  organizationId = null,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  organizationId?: string | null
}) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavJobs organizationId={organizationId} />
        <NavProjects
          projects={[
            {
              name: "All candidates",
              url: "/dashboard/candidates",
              icon: <UsersIcon />,
            },
          ]}
          organizationId={organizationId}
        />
        <NavSecondary
          prepend={<SidebarThemeToggle />}
          items={data.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

import { useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import {
  ChevronsUpDown,
  CreditCard,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { meQueryOptions } from "@/api/user.queries";
import { farmQueryOptions } from "@/api/farm.queries";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useAuth } from "@/context/SupabaseAuthContext";
import { cn } from "@/lib/utils";
import type { FarmPermissionFeature } from "@/api/types";
import { SECTIONS, findActiveSection } from "@/components/navigation/navConfig";

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
] as const;

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = useLocation({ select: (location) => location.pathname });

  const themeOptions = [
    { value: "system", label: t("common.theme.system"), icon: Monitor },
    { value: "light", label: t("common.theme.light"), icon: Sun },
    { value: "dark", label: t("common.theme.dark"), icon: Moon },
  ];

  const meQuery = useQuery(meQueryOptions());
  const me = meQuery.data;
  const hasFarm = me?.farmId != null;
  const farmQuery = useQuery(farmQueryOptions(hasFarm));
  const isOwner = me?.farmRole === "owner";

  // Feature gates — one hook per feature (owners get full access inside the hook).
  const access: Record<FarmPermissionFeature, boolean> = {
    animals: useFeatureAccess("animals").canRead,
    field_calendar: useFeatureAccess("field_calendar").canRead,
    commerce: useFeatureAccess("commerce").canRead,
    tasks: useFeatureAccess("tasks").canRead,
  };

  const activeSection = findActiveSection(pathname);

  const visibleSections = useMemo(
    () =>
      SECTIONS.filter((section) => {
        if (section.requiresFarm && !hasFarm) return false;
        if (section.feature && !access[section.feature]) return false;
        return true;
      }),
    [hasFarm, access.animals, access.field_calendar, access.commerce, access.tasks],
  );

  function changeLanguage(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("language", code);
  }

  const userName = me?.fullName ?? me?.email ?? "";
  const initials = userName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center border-b">
        <div className="flex items-center gap-2 px-1">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {(farmQuery.data?.name ?? "Coltivio").charAt(0)}
          </div>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {farmQuery.data?.name ?? "Coltivio"}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSections.map((section) => {
                const Icon = section.icon;
                const label =
                  section.id === "overview" && !hasFarm
                    ? t("nav.myFarm")
                    : t(section.labelKey);
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeSection?.id === section.id}
                      tooltip={label}
                    >
                      <Link to={section.to}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-7 rounded-md">
                    <AvatarFallback className="rounded-md bg-mocha text-xs text-mocha-foreground">
                      {initials || <User className="size-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">{me?.fullName ?? ""}</span>
                    <span className="truncate text-xs text-muted-foreground">{me?.email}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              >
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {me?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link to="/users">
                      <Users className="size-4" />
                      {t("nav.users")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <User className="size-4" />
                    {t("nav.account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="size-4" />
                    {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/membership">
                    <CreditCard className="size-4" />
                    {t("nav.membership")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Globe className="size-4" />
                    {LANGUAGES.find((lang) => lang.code === i18n.language)?.label ??
                      "Sprache"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {LANGUAGES.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={cn(i18n.language === lang.code && "font-semibold")}
                      >
                        {lang.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="size-4 dark:hidden" />
                    <Moon className="hidden size-4 dark:block" />
                    {t("common.theme.label")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {themeOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={cn(theme === option.value && "font-semibold")}
                      >
                        <option.icon className="size-4" />
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="size-4" />
                  {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

import { useMemo, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import {
  Check,
  ChevronsUpDown,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
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
  SidebarRail,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { meQueryOptions, farmUsersQueryOptions } from "@/api/user.queries";
import {
  farmQueryOptions,
  useDeleteFarmMutation,
  useLeaveFarmMutation,
} from "@/api/farm.queries";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useAuth } from "@/context/SupabaseAuthContext";
import { useActiveFarm } from "@/context/ActiveFarmContext";
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

  const { farms, activeFarmId, setActiveFarm, onActiveFarmRemoved } = useActiveFarm();
  const activeFarm = farms.find((farm) => farm.id === activeFarmId);
  const farmName = activeFarm?.name ?? farmQuery.data?.name ?? "Coltivio";
  const hasAnyFarm = farms.length > 0;
  const isActiveFarmOwner = activeFarm?.role === "owner";

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [farmActionError, setFarmActionError] = useState<string | null>(null);
  const leaveFarmMutation = useLeaveFarmMutation();
  const deleteFarmMutation = useDeleteFarmMutation();

  // Member list of the active farm — only needed to tell whether the user is the last one.
  const farmUsersQuery = useQuery({
    ...farmUsersQueryOptions(),
    enabled: leaveDialogOpen,
  });
  // Only block leaving when we positively know the user is the sole member; on load/error
  // fall through and let the backend decide.
  const isLastFarmMember = farmUsersQuery.data?.result.length === 1;
  const leaveConfirmDisabled =
    isLastFarmMember || farmUsersQuery.isLoading || leaveFarmMutation.isPending;

  // Require the farm name to be re-typed exactly before delete is allowed.
  const deleteConfirmed =
    activeFarm != null && deleteConfirmText.trim() === activeFarm.name;

  function confirmLeaveFarm() {
    setFarmActionError(null);
    leaveFarmMutation.mutate(undefined, {
      onSuccess: () => {
        setLeaveDialogOpen(false);
        void onActiveFarmRemoved();
      },
      onError: (error) => setFarmActionError(error.message),
    });
  }

  function confirmDeleteFarm() {
    setFarmActionError(null);
    deleteFarmMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        void onActiveFarmRemoved();
      },
      onError: (error) => setFarmActionError(error.message),
    });
  }

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
        {hasAnyFarm ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-1 py-1 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {farmName.charAt(0)}
                </div>
                <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
                  {farmName}
                </span>
                <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            >
              {farms.length > 1 && (
                <DropdownMenuLabel className="font-normal text-muted-foreground">
                  {t("farm.switcher.label")}
                </DropdownMenuLabel>
              )}
              {farms.map((farm) => (
                <DropdownMenuItem
                  key={farm.id}
                  onClick={() => {
                    if (farm.id !== activeFarmId) setActiveFarm(farm.id);
                  }}
                  className={cn(farm.id === activeFarmId && "font-semibold")}
                >
                  <Check
                    className={cn(
                      "size-4",
                      farm.id === activeFarmId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{farm.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/farms/new">
                  <Plus className="size-4" />
                  {t("farm.switcher.add")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setFarmActionError(null);
                  setLeaveDialogOpen(true);
                }}
              >
                <LogOut className="size-4" />
                {t("farm.leave.action")}
              </DropdownMenuItem>
              {isActiveFarmOwner && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setFarmActionError(null);
                    setDeleteConfirmText("");
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="size-4" />
                  {t("farm.delete.action")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              {farmName.charAt(0)}
            </div>
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              {farmName}
            </span>
          </div>
        )}
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
                    <AvatarFallback className="rounded-md bg-primary text-xs text-primary-foreground">
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
      <SidebarRail />

      <AlertDialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (!leaveFarmMutation.isPending) setLeaveDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("farm.leave.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("farm.leave.description", { farm: farmName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isLastFarmMember && (
            <p className="text-sm text-destructive">{t("farm.leave.lastMember")}</p>
          )}
          {farmActionError && (
            <p className="text-sm text-destructive">{farmActionError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveFarmMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmLeaveFarm();
              }}
              disabled={leaveConfirmDisabled}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("farm.leave.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteFarmMutation.isPending) setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("farm.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("farm.delete.description", { farm: farmName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="delete-farm-confirm" className="text-sm text-muted-foreground">
              {t("farm.delete.confirmPrompt", { farm: farmName })}
            </label>
            <Input
              id="delete-farm-confirm"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              autoComplete="off"
              disabled={deleteFarmMutation.isPending}
            />
          </div>
          {farmActionError && (
            <p className="text-sm text-destructive">{farmActionError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFarmMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteFarm();
              }}
              disabled={!deleteConfirmed || deleteFarmMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("farm.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

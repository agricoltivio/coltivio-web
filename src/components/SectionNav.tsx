import { useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { meQueryOptions } from "@/api/user.queries";
import { cn } from "@/lib/utils";
import { findActiveSection, type NavSubItem } from "@/components/navigation/navConfig";

/**
 * Second-tier navigation, rendered as a horizontal bar in the top strip.
 * Shows the pages of whichever section the user is currently in; renders
 * nothing for sections without subpages (Übersicht, Aufgaben, Treffpunkt).
 *
 * Sections with `groups` (Feldkalender) collapse each multi-item group into a
 * dropdown so the bar stays short; single-item groups render as direct links.
 */
export function SectionNav() {
  const { t } = useTranslation();
  const pathname = useLocation({ select: (location) => location.pathname });
  const meQuery = useQuery(meQueryOptions());
  const isModerator = meQuery.data?.isWikiModerator ?? false;

  const section = findActiveSection(pathname);

  const visibleItems = useMemo(
    () => (section?.items ?? []).filter((item) => !item.moderatorOnly || isModerator),
    [section, isModerator],
  );

  // Active item = the one whose path is the longest prefix of the current
  // pathname, so a detail page keeps its parent list item highlighted.
  const activeTo = useMemo(() => {
    const matches = visibleItems.filter(
      (item) => pathname === item.to || pathname.startsWith(item.to + "/"),
    );
    return matches.sort((a, b) => b.to.length - a.to.length)[0]?.to;
  }, [visibleItems, pathname]);

  if (!section) return null;

  const entryClass =
    "flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  const entryActiveClass = "bg-accent text-accent-foreground font-medium";

  function DirectLink({ item }: { item: NavSubItem }) {
    return (
      <Link
        to={item.to}
        className={cn(entryClass, item.to === activeTo && entryActiveClass)}
      >
        {t(item.labelKey)}
      </Link>
    );
  }

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      <span className="shrink-0 px-1 text-sm font-medium">{t(section.labelKey)}</span>
      {visibleItems.length > 0 && (
        <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
      )}
      {section.groups
        ? section.groups.map((group) => {
            const groupItems = visibleItems.filter((item) => item.groupKey === group.key);
            if (groupItems.length === 0) return null;
            if (groupItems.length === 1) {
              return <DirectLink key={group.key} item={groupItems[0]} />;
            }
            const groupActive = groupItems.some((item) => item.to === activeTo);
            return (
              <DropdownMenu key={group.key}>
                <DropdownMenuTrigger
                  className={cn(entryClass, "outline-none", groupActive && entryActiveClass)}
                >
                  {t(group.labelKey)}
                  <ChevronDown className="size-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {groupItems.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link
                        to={item.to}
                        className={cn(item.to === activeTo && "font-medium")}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })
        : visibleItems.map((item) => <DirectLink key={item.to} item={item} />)}
    </nav>
  );
}

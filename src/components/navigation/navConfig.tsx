import type { ComponentType } from "react";
import {
  BookOpen,
  HeartHandshake,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  ShoppingCart,
  Sprout,
} from "lucide-react";
import type { FileRouteTypes } from "@/routeTree.gen";
import type { FarmPermissionFeature } from "@/api/types";

/** A route path that <Link to> accepts. */
export type NavPath = FileRouteTypes["to"];

type NavIcon = ComponentType<{ className?: string }>;

export interface NavSubItem {
  labelKey: string;
  to: NavPath;
  /** which section group this item belongs to (only used when the section has `groups`) */
  groupKey?: string;
  /** only render for wiki moderators */
  moderatorOnly?: boolean;
}

export interface NavSection {
  id: string;
  labelKey: string;
  icon: NavIcon;
  /** where the primary rail item links to */
  to: NavPath;
  /** pathname prefixes that mean "the user is inside this section" */
  match: readonly string[];
  /** feature permission required to see this section */
  feature?: FarmPermissionFeature;
  /** section is only relevant once the user has a farm */
  requiresFarm?: boolean;
  /** ordered subnav groups; omit for a flat list */
  groups?: readonly { key: string; labelKey: string }[];
  items: readonly NavSubItem[];
}

/** The livestock section icon — a cow, which lucide doesn't have. */
export function CowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M96 288L96 480C96 497.7 110.3 512 128 512L160 512C177.7 512 192 497.7 192 480L192 391.8C201.9 398.4 212.6 403.8 224 407.9L224 432.1C224 440.9 231.2 448.1 240 448.1C248.8 448.1 256 440.9 256 432.1L256 415.2C261.3 415.8 266.6 416.1 272 416.1C277.4 416.1 282.7 415.8 288 415.2L288 432.1C288 440.9 295.2 448.1 304 448.1C312.8 448.1 320 440.9 320 432.1L320 407.9C331.4 403.9 342.1 398.5 352 391.8L352 480C352 497.7 366.3 512 384 512L416 512C433.7 512 448 497.7 448 480L448 320L480 352L480 401.5C480 411 482.8 420.2 488.1 428.1L530 491C538.8 504.1 553.5 512 569.3 512C591.8 512 611.2 496.1 615.6 474L635.9 372.4C638.5 359.4 635.6 345.9 627.9 335.1L624 329.6L624 248C624 234.7 613.3 224 600 224C586.7 224 576 234.7 576 248L576 262.4L523.1 188.3C496 150.5 452.4 128 405.9 128L144 128C77.7 128 24 181.7 24 248L24 302C9.4 313.8 0 331.8 0 352L0 369.6C0 377.6 6.4 384 14.4 384C46.2 384 72 358.2 72 326.4L72 248C72 223.7 84.1 202.2 102.5 189.1C98.3 199.9 96 211.7 96 224L96 288zM560 400C560 391.2 567.2 384 576 384C584.8 384 592 391.2 592 400C592 408.8 584.8 416 576 416C567.2 416 560 408.8 560 400zM166.6 230.6C162.4 226.4 160 220.6 160 214.6C160 202.1 170.1 192 182.6 192L361.3 192C373.8 192 383.9 202.1 383.9 214.6C383.9 220.6 381.5 226.4 377.3 230.6L353.9 254C332.2 275.8 302.7 288 272 288C241.3 288 211.8 275.8 190.1 254.1L166.7 230.7z" />
    </svg>
  );
}

export const SECTIONS: readonly NavSection[] = [
  {
    id: "overview",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    to: "/dashboard",
    match: ["/dashboard"],
    items: [],
  },
  {
    id: "tasks",
    labelKey: "nav.tasks",
    icon: ListTodo,
    to: "/tasks",
    match: ["/tasks"],
    feature: "tasks",
    requiresFarm: true,
    items: [],
  },
  {
    id: "animals",
    labelKey: "nav.groups.livestock",
    icon: CowIcon,
    to: "/animals",
    match: ["/animals", "/drugs", "/treatments"],
    feature: "animals",
    requiresFarm: true,
    items: [
      { labelKey: "nav.animals", to: "/animals" },
      { labelKey: "nav.earTags", to: "/animals/ear-tags" },
      { labelKey: "nav.herds", to: "/animals/herds" },
      { labelKey: "nav.treatmentsJournal", to: "/animals/treatments-journal" },
      { labelKey: "nav.turnoutJournal", to: "/animals/turnout-journal" },
      { labelKey: "nav.drugs", to: "/drugs" },
    ],
  },
  {
    id: "field",
    labelKey: "nav.groups.fieldCalendar",
    icon: Sprout,
    to: "/field-calendar/plots",
    match: ["/field-calendar"],
    feature: "field_calendar",
    requiresFarm: true,
    groups: [
      { key: "areas", labelKey: "nav.fieldGroups.areas" },
      { key: "crops", labelKey: "nav.fieldGroups.crops" },
      { key: "measures", labelKey: "nav.fieldGroups.measures" },
      { key: "inputs", labelKey: "nav.fieldGroups.inputs" },
      { key: "analysis", labelKey: "nav.fieldGroups.analysis" },
    ],
    items: [
      { labelKey: "nav.plots", to: "/field-calendar/plots", groupKey: "areas" },
      { labelKey: "nav.crops", to: "/field-calendar/crops", groupKey: "crops" },
      { labelKey: "nav.cropFamilies", to: "/field-calendar/crop-families", groupKey: "crops" },
      { labelKey: "nav.cropRotations", to: "/field-calendar/crop-rotations", groupKey: "crops" },
      { labelKey: "nav.tillages", to: "/field-calendar/tillages", groupKey: "measures" },
      { labelKey: "nav.fertilizerApplications", to: "/field-calendar/fertilizer-applications", groupKey: "measures" },
      { labelKey: "nav.cropProtectionApplications", to: "/field-calendar/crop-protection-applications", groupKey: "measures" },
      { labelKey: "nav.harvests", to: "/field-calendar/harvests", groupKey: "measures" },
      { labelKey: "nav.fertilizers", to: "/field-calendar/fertilizers", groupKey: "inputs" },
      { labelKey: "nav.cropProtectionProducts", to: "/field-calendar/crop-protection-products", groupKey: "inputs" },
      { labelKey: "nav.fieldCalendarExport", to: "/field-calendar/export", groupKey: "analysis" },
    ],
  },
  {
    id: "sales",
    labelKey: "nav.groups.sales",
    icon: ShoppingCart,
    to: "/orders",
    match: ["/orders", "/products", "/contacts"],
    feature: "commerce",
    requiresFarm: true,
    items: [
      { labelKey: "nav.orders", to: "/orders" },
      { labelKey: "nav.products", to: "/products" },
      { labelKey: "nav.contacts", to: "/contacts" },
      { labelKey: "nav.invoiceSettings", to: "/orders/invoice-settings" },
    ],
  },
  {
    id: "sponsor",
    labelKey: "nav.groups.sponsorships",
    icon: HeartHandshake,
    to: "/sponsorships",
    match: ["/sponsorships"],
    feature: "commerce",
    requiresFarm: true,
    items: [
      { labelKey: "nav.sponsorships", to: "/sponsorships" },
      { labelKey: "nav.sponsorshipPrograms", to: "/sponsorships/programs" },
    ],
  },
  {
    id: "wiki",
    labelKey: "nav.groups.wiki",
    icon: BookOpen,
    to: "/wiki",
    match: ["/wiki"],
    requiresFarm: true,
    items: [
      { labelKey: "nav.wiki", to: "/wiki" },
      { labelKey: "nav.wikiMySubmissions", to: "/wiki/my-submissions" },
      { labelKey: "nav.wikiAdmin", to: "/wiki/admin", moderatorOnly: true },
    ],
  },
  {
    id: "treff",
    labelKey: "nav.treffpunkt",
    icon: MessageSquare,
    to: "/treffpunkt",
    match: ["/treffpunkt"],
    items: [],
  },
];

/** The section whose `match` prefixes contain the given pathname, if any. */
export function findActiveSection(pathname: string): NavSection | undefined {
  return SECTIONS.find((section) =>
    section.match.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")),
  );
}

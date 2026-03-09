import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Download,
  Droplets,
  FlaskConical,
  HeartHandshake,
  Layers,
  Leaf,
  Map,
  NotebookPen,
  NotepadText,
  Package,
  Pill,
  RefreshCw,
  Settings,
  Shield,
  ShoppingCart,
  Syringe,
  Tag,
  User,
  Users,
  Wheat,
} from "lucide-react";

export function AppSidebar() {
  const { t } = useTranslation();
  // Prevent the browser from auto-scrolling the sidebar when a link is clicked.
  // The browser scrolls a container synchronously during focus (before rAF), so we
  // capture the scroll position on pointerdown and restore it in onFocusCapture.
  // Keyboard navigation is unaffected because it never sets isPointerFocus.
  const savedScrollRef = useRef(0);
  const isPointerFocusRef = useRef(false);
  return (
    <Sidebar>
      <SidebarHeader>Coltivio</SidebarHeader>
      <SidebarContent
        onPointerDownCapture={(e) => {
          savedScrollRef.current = e.currentTarget.scrollTop;
          isPointerFocusRef.current = true;
        }}
        onFocusCapture={(e) => {
          if (!isPointerFocusRef.current) return;
          isPointerFocusRef.current = false;
          e.currentTarget.scrollTop = savedScrollRef.current;
        }}
      >
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.livestock")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/animals"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 640"
                    >
                      <path d="M96 288L96 480C96 497.7 110.3 512 128 512L160 512C177.7 512 192 497.7 192 480L192 391.8C201.9 398.4 212.6 403.8 224 407.9L224 432.1C224 440.9 231.2 448.1 240 448.1C248.8 448.1 256 440.9 256 432.1L256 415.2C261.3 415.8 266.6 416.1 272 416.1C277.4 416.1 282.7 415.8 288 415.2L288 432.1C288 440.9 295.2 448.1 304 448.1C312.8 448.1 320 440.9 320 432.1L320 407.9C331.4 403.9 342.1 398.5 352 391.8L352 480C352 497.7 366.3 512 384 512L416 512C433.7 512 448 497.7 448 480L448 320L480 352L480 401.5C480 411 482.8 420.2 488.1 428.1L530 491C538.8 504.1 553.5 512 569.3 512C591.8 512 611.2 496.1 615.6 474L635.9 372.4C638.5 359.4 635.6 345.9 627.9 335.1L624 329.6L624 248C624 234.7 613.3 224 600 224C586.7 224 576 234.7 576 248L576 262.4L523.1 188.3C496 150.5 452.4 128 405.9 128L144 128C77.7 128 24 181.7 24 248L24 302C9.4 313.8 0 331.8 0 352L0 369.6C0 377.6 6.4 384 14.4 384C46.2 384 72 358.2 72 326.4L72 248C72 223.7 84.1 202.2 102.5 189.1C98.3 199.9 96 211.7 96 224L96 288zM560 400C560 391.2 567.2 384 576 384C584.8 384 592 391.2 592 400C592 408.8 584.8 416 576 416C567.2 416 560 408.8 560 400zM166.6 230.6C162.4 226.4 160 220.6 160 214.6C160 202.1 170.1 192 182.6 192L361.3 192C373.8 192 383.9 202.1 383.9 214.6C383.9 220.6 381.5 226.4 377.3 230.6L353.9 254C332.2 275.8 302.7 288 272 288C241.3 288 211.8 275.8 190.1 254.1L166.7 230.7z" />
                    </svg>{" "}
                    {t("nav.animals")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/animals/ear-tags"
                  >
                    <Tag /> {t("nav.earTags")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/animals/treatments-journal"
                  >
                    <Syringe /> {t("nav.treatmentsJournal")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/animals/turnout-journal"
                  >
                    <NotebookPen /> {t("nav.turnoutJournal")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/animals/herds"
                  >
                    <Users /> {t("nav.herds")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/drugs"
                  >
                    <Pill /> {t("nav.drugs")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.addressBook")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/contacts"
                  >
                    <Users /> {t("nav.contacts")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.sales")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/orders"
                  >
                    <ShoppingCart /> {t("nav.orders")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/products"
                  >
                    <Package /> {t("nav.products")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.sponsorships")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/sponsorships/programs"
                  >
                    <NotepadText /> {t("nav.sponsorshipPrograms")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/sponsorships"
                  >
                    <HeartHandshake /> {t("nav.sponsorships")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.accounting")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/payments"
                  >
                    <CreditCard /> {t("nav.payments")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.fieldCalendar")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/plots"
                  >
                    <Map /> {t("nav.plots")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/crop-rotations"
                  >
                    <RefreshCw /> {t("nav.cropRotations")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/tillages"
                  >
                    <Layers /> {t("nav.tillages")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/fertilizer-applications"
                  >
                    <Droplets /> {t("nav.fertilizerApplications")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/crop-protection-applications"
                  >
                    <Shield /> {t("nav.cropProtectionApplications")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/harvests"
                  >
                    <Wheat /> {t("nav.harvests")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/crops"
                  >
                    <Leaf /> {t("nav.crops")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/crop-families"
                  >
                    <Leaf /> {t("nav.cropFamilies")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/fertilizers"
                  >
                    <Droplets /> {t("nav.fertilizers")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/crop-protection-products"
                  >
                    <FlaskConical /> {t("nav.cropProtectionProducts")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/field-calendar/export"
                  >
                    <Download /> {t("nav.fieldCalendarExport")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groups.admin")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/account"
                  >
                    <User /> {t("nav.account")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground transition-colors",
                    }}
                    to="/settings"
                  >
                    <Settings /> {t("nav.settings")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

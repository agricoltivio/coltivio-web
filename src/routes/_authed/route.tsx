import { AppSidebar } from "@/components/AppSidebar";
import { MembershipPaywall } from "@/components/MembershipPaywall";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { farmQueryOptions } from "@/api/farm.queries";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.session) {
      throw redirect({
        to: "/login",
        search: {
          // Save current location for redirect after login
          redirect: location.href,
        },
      });
    }
  },
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(farmQueryOptions());
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const farmQuery = useQuery(farmQueryOptions());
  const hasActiveMembership = farmQuery.data?.hasActiveMembership ?? false;

  if (!farmQuery.isLoading && !hasActiveMembership) {
    return <MembershipPaywall />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden container mx-auto px-4 py-8">
          <SidebarTrigger />
          <Outlet />
        </main>
      </SidebarProvider>
    </div>
  );
}

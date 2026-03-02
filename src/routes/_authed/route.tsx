import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

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
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
      <SidebarProvider>
        {/* <div className="relative flex min-h-screen flex-col">
        <main className="flex-1 min-w-0 overflow-x-hidden container mx-auto px-4 py-8"> */}
        {/* <Navbar /> */}
        <AppSidebar />

        <main className="flex-1 min-w-0 overflow-x-hidden container mx-auto px-4 py-8">
          <SidebarTrigger />
          <Outlet />
        </main>
      </SidebarProvider>
      {/* </main>
      </div> */}
    </div>
  );
}

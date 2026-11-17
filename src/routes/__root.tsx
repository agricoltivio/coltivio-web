import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import { ActiveFarmProvider } from "@/context/ActiveFarmContext";
import type { SupabaseAuthState } from "@/context/SupabaseAuthContext";
import type { QueryClient } from "@tanstack/react-query";

export interface ColtivioRouterContext {
  queryClient: QueryClient;
  auth: SupabaseAuthState;
}

export const Route = createRootRouteWithContext<ColtivioRouterContext>()({
  component: () => (
    <ActiveFarmProvider>
      {/* <Header /> */}
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
          // No keyboard shortcuts: they fire while typing capitals in forms (Shift) and swallow keystrokes.
          // The devtools still open via their button.
          openHotkey: [],
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </ActiveFarmProvider>
  ),
});

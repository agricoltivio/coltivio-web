import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2">Welcome to Coltivio</h1>
        <p className="text-gray-700">
          This is your dashboard where you can manage all your animals,
          contacts, and farm data.
        </p>
      </section>

      {/* Example cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="font-semibold mb-2">Animals</h2>
          <p className="text-gray-600 text-sm">View and manage your animals.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="font-semibold mb-2">Contacts</h2>
          <p className="text-gray-600 text-sm">Manage your farm contacts.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="font-semibold mb-2">Reports</h2>
          <p className="text-gray-600 text-sm">
            Generate and view farm reports.
          </p>
        </div>
      </section>
    </div>
  );
}

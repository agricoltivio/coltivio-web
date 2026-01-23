import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function Navbar() {
  const { t } = useTranslation();
  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="text-lg font-bold">Coltivio</div>

        {/* Navigation Links */}
        <ul className="flex space-x-4">
          <li>
            <Link
              activeProps={{
                className: "bg-gray-700 text-white transition-colors",
              }}
              to="/dashboard"
              className="px-3 py-2 rounded-md text-sm font-medium
                           text-gray-200 hover:bg-gray-600 hover:text-white"
            >
              {t("nav.dashboard")}
            </Link>
          </li>
          <li>
            <Link
              activeProps={{
                className: "bg-gray-700 text-white transition-colors",
              }}
              to="/animals"
              className="px-3 py-2 rounded-md text-sm font-medium
                           text-gray-200 hover:bg-gray-600 hover:text-white"
            >
              {t("nav.animals")}
            </Link>
          </li>
          <li>
            <Link
              activeProps={{
                className: "bg-gray-700 text-white transition-colors",
              }}
              to="/contacts"
              className="px-3 py-2 rounded-md text-sm font-medium
                           text-gray-200 hover:bg-gray-600 hover:text-white"
            >
              {t("nav.contacts")}
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

import { useTranslation } from "react-i18next";

export function NoFarm() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-sm w-full mx-auto px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Coltivio</h1>
        <p className="text-gray-600">{t("noFarm.message")}</p>
      </div>
    </div>
  );
}

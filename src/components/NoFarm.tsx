import { useTranslation } from "react-i18next";

export function NoFarm() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="max-w-sm w-full mx-auto px-6 text-center">
        <p className="text-gray-600">{t("noFarm.message")}</p>
      </div>
    </div>
  );
}

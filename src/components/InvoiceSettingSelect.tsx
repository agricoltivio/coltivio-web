import { useQuery } from "@tanstack/react-query";
import { invoiceSettingsQueryOptions } from "@/api/orders.queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface InvoiceSettingSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function InvoiceSettingSelect({ value, onChange }: InvoiceSettingSelectProps) {
  const { t } = useTranslation();
  const { data: settings = [] } = useQuery(invoiceSettingsQueryOptions());

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={t("orders.selectInvoiceSetting")} />
      </SelectTrigger>
      <SelectContent>
        {settings.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name} — {s.senderName}, {s.city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

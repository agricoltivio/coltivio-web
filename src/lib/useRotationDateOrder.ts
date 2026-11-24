import { useTranslation } from "react-i18next";

// Keeps the dates of a crop rotation dialog in order (values are "YYYY-MM-DD" strings): moving the start past the end
// moves the end along, and the end past the recurrence end that one too. The browser's min only limits its picker, a
// typed or earlier value can still be out of order, so dateOrderError says what's wrong and the dialog can't save.
export function useRotationDateOrder({
  fromDate,
  toDate,
  untilDate,
  hasRecurrence,
  hasUntil,
  setFromDate,
  setToDate,
  setUntilDate,
}: {
  fromDate: string;
  toDate: string;
  untilDate: string;
  hasRecurrence: boolean;
  hasUntil: boolean;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  setUntilDate: (value: string) => void;
}) {
  const { t } = useTranslation();

  function changeToDate(value: string) {
    setToDate(value);
    if (value && untilDate && untilDate < value) setUntilDate(value);
  }
  function changeFromDate(value: string) {
    setFromDate(value);
    if (value && toDate && toDate < value) changeToDate(value);
  }

  const dateOrderError =
    fromDate && toDate && toDate < fromDate
      ? t("fieldCalendar.cropRotations.endBeforeStart")
      : hasRecurrence && hasUntil && untilDate && toDate && untilDate < toDate
        ? t("fieldCalendar.cropRotations.untilBeforeEnd")
        : null;

  return { changeFromDate, changeToDate, dateOrderError };
}

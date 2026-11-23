// Ear tag ranges, numbered like the API does it: prefix (any text, e.g. "CH 120.") followed by
// the number, zero padded to the first number's length, e.g. ("CH", "001", 50) -> CH001..CH050.

// The numbers of a range are digits only; any letters or punctuation go into the prefix
export const EAR_TAG_RANGE_DIGITS_PATTERN = /^\d+$/;

// Largest range the API creates or deletes at once
export const MAX_EAR_TAG_RANGE_SIZE = 1000;

export type EarTagRange = {
  prefix: string;
  // Digits as sent to the API (prefix separate)
  fromDigits: string;
  toDigits: string;
  // Full ear tag numbers, for display
  fromNumber: string;
  toNumber: string;
  amount: number;
  // Whether an existing ear tag number lies in the range (an exact match: "CH0105" isn't "CH105")
  contains: (earTagNumber: string) => boolean;
};

// Null while the input is incomplete or invalid
export function buildEarTagRange(
  prefixInput: string,
  fromDigitsInput: string,
  amountInput: string,
): EarTagRange | null {
  const fromDigits = fromDigitsInput.trim();
  const amount = EAR_TAG_RANGE_DIGITS_PATTERN.test(amountInput.trim())
    ? parseInt(amountInput, 10)
    : 0;
  if (!EAR_TAG_RANGE_DIGITS_PATTERN.test(fromDigits) || amount < 1) return null;
  // Trailing spaces are kept on purpose, e.g. "CH " for "CH 001"
  const prefix = prefixInput.trimStart();
  const firstValue = parseInt(fromDigits, 10);
  const lastValue = firstValue + amount - 1;
  const formatDigits = (value: number) =>
    value.toString().padStart(fromDigits.length, "0");
  const toDigits = formatDigits(lastValue);

  return {
    prefix,
    fromDigits,
    toDigits,
    fromNumber: `${prefix}${fromDigits}`,
    toNumber: `${prefix}${toDigits}`,
    amount,
    contains: (earTagNumber) => {
      if (!earTagNumber.startsWith(prefix)) return false;
      const rest = earTagNumber.slice(prefix.length);
      if (!EAR_TAG_RANGE_DIGITS_PATTERN.test(rest)) return false;
      const value = parseInt(rest, 10);
      return (
        value >= firstValue &&
        value <= lastValue &&
        formatDigits(value) === rest
      );
    },
  };
}

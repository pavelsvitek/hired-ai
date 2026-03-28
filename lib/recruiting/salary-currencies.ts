/** ISO 4217 codes allowed for job salary currency in create flows. */
export const SALARY_CURRENCIES = ["CHF", "EUR", "USD", "GBP"] as const;

export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

export const SALARY_CURRENCY_OPTIONS: {
  value: SalaryCurrency;
  label: string;
}[] = [
  { value: "CHF", label: "CHF" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
];

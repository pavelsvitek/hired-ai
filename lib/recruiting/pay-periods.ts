/** Stored on `job.pay_period` for create flows. */
export const PAY_PERIODS = ["yearly", "monthly", "hourly"] as const;

export type PayPeriod = (typeof PAY_PERIODS)[number];

export const PAY_PERIOD_OPTIONS: { value: PayPeriod; label: string }[] = [
  { value: "yearly", label: "Yearly" },
  { value: "monthly", label: "Monthly" },
  { value: "hourly", label: "Hourly" },
];

// All money is kept in paise (whole numbers). Rs 125.50 is 12550.
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return "₹" + rupees.toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

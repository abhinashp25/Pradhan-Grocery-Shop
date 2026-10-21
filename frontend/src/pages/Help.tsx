import { useText } from "../lib/lang";
import { useTitle } from "../lib/useTitle";

export function Help() {
  const t = useText();
  useTitle("Help", "How to use the Pradhan Grocery Store app.");
  const steps = [t("step1"), t("step2"), t("step3")];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">{t("help")}</h1>
      <section>
        <h2 className="mb-2 font-display text-2xl font-extrabold">{t("howItWorks")}</h2>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-4 rounded-2xl bg-card p-4">
              <span className="font-display text-4xl font-extrabold text-saffron">{i + 1}</span>
              <span className="font-bold">{step}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="mb-2 font-display text-2xl font-extrabold">{t("questions")}</h2>
        {[1, 2, 3, 4].map((n) => (
          <details key={n} className="mb-2 rounded-2xl bg-card p-4">
            <summary className="min-h-8 cursor-pointer font-bold">{t(`faq${n}q`)}</summary>
            <p className="mt-2">{t(`faq${n}a`)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

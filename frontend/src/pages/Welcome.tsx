import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lang, setLang, useText, useLang } from "../lib/lang";
import { useTitle } from "../lib/useTitle";

// Exact reference design: Full-width hero image with smooth bottom curve,
// clean white bottom sheet, bold headline, pill dots, and proper round green CTA.
export function Welcome() {
  const t = useText();
  const currentLang = useLang();
  const go = useNavigate();
  const [step, setStep] = useState(0);
  useTitle("Welcome");

  function choose(lang: Lang) {
    setLang(lang);
    setStep(1);
  }

  const finish = () => go("/", { replace: true });

  const slides = [
    {
      title: t("step1"),
      text: t("slide1"),
    },
    {
      title: t("step2"),
      text: t("slide2"),
    },
    {
      title: t("step3"),
      text: t("slide3"),
    },
  ];

  const currentSlide = step > 0 ? slides[step - 1] : null;

  return (
    <div className="min-h-screen w-full bg-card flex flex-col justify-between overflow-x-hidden select-none">
      {/* Top Hero Section: Full width background image with smooth bottom curve (NOT a round circle) */}
      <div
        className="relative w-full h-[52vh] sm:h-[58vh] bg-forest overflow-hidden"
        style={{
          clipPath: "ellipse(88% 100% at 50% 0%)",
          WebkitClipPath: "ellipse(88% 100% at 50% 0%)",
        }}
      >
        {/* Full-bleed hero image matching reference */}
        <img
          src="/welcome.webp"
          alt="Pradhan Grocery Store"
          fetchPriority="high"
          className="w-full h-full object-cover object-top"
        />

        {/* Top Header Overlay with Logo & Skip */}
        <header className="absolute top-0 inset-x-0 flex items-center justify-between px-6 pt-6 z-10">
          <div className="flex items-center gap-2 bg-forest/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm">
            <img src="/App_logo.png" alt="" className="h-7 w-auto object-contain brightness-0 invert" />
            <span className="font-display font-bold text-sm text-[#FFF8EC] tracking-tight">Pradhan Grocery</span>
          </div>
          {step > 0 && (
            <button
              onClick={finish}
              className="text-xs font-bold text-[#FFF8EC] px-4 py-1.5 rounded-full bg-forest/80 backdrop-blur-md border border-white/15 hover:bg-forest transition-all active:scale-[0.94] shadow-sm"
            >
              {t("skip")}
            </button>
          )}
        </header>

        {/* Subtle gradient vignette at bottom of curve */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-forest/30 to-transparent pointer-events-none"
        />
      </div>

      {/* Bottom Area: Clean white surface matching reference */}
      <div className="flex-1 w-full bg-card text-ink flex flex-col justify-between px-6 sm:px-10 pt-4 pb-8 max-w-md mx-auto">
        {step === 0 ? (
          /* Step 0: Language Selection */
          <div className="space-y-6 text-center my-auto">
            <div className="space-y-2">
              <span className="inline-block text-xs uppercase tracking-widest font-extrabold text-forest bg-forest/10 px-3.5 py-1 rounded-full">
                ନମସ୍କାର · Welcome
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t("shopName")}
              </h1>
              <p className="text-sm text-muted font-medium">
                {t("chooseLanguage")}
              </p>
            </div>

            <div className="grid gap-3 pt-2">
              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg bg-saffron text-[#3A2A1E] shadow-[0_4px_0_#B25F00] transition-transform duration-100 ease-out active:scale-[0.96] hover:brightness-105"
                onClick={() => choose("or")}
              >
                ଓଡ଼ିଆ (Odia)
              </button>
              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg border-2 border-line bg-card text-ink transition-transform duration-100 ease-out active:scale-[0.96] hover:border-saffron hover:bg-saffron/10"
                onClick={() => choose("hi")}
              >
                हिन्दी (Hindi)
              </button>
              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg border-2 border-line bg-card text-ink transition-transform duration-100 ease-out active:scale-[0.96] hover:border-saffron hover:bg-saffron/10"
                onClick={() => choose("en")}
              >
                English
              </button>
            </div>
          </div>
        ) : (
          /* Steps 1-3: Exact Reference Layout */
          <div className="flex-1 flex flex-col justify-between text-center py-2 space-y-6">
            {/* Title & Subtitle */}
            <div className="space-y-3 pt-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                {currentSlide?.title}
              </h1>
              <p className="text-sm sm:text-base text-muted font-medium max-w-xs mx-auto leading-relaxed">
                {currentSlide?.text}
              </p>
            </div>

            {/* Pagination Pill Dots matching Apple & reference design */}
            <div className="flex items-center justify-center gap-2 py-2" role="tablist" aria-label="Slides">
              {[1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Slide ${i}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step === i ? "w-8 bg-forest" : "w-2.5 bg-line/60 hover:bg-line"
                  }`}
                />
              ))}
            </div>

            {/* CTA Button: Full width round pill button matching reference */}
            <div className="pt-2">
              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg bg-forest text-[#FFF8EC] shadow-md transition-all duration-100 ease-out hover:brightness-110 active:scale-[0.96]"
                onClick={() => (step === 3 ? finish() : setStep(step + 1))}
              >
                {step === 3 ? (currentLang === "en" ? "Let's explore" : t("start")) : t("next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

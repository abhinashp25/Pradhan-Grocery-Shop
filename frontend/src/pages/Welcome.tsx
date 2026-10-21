import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/icons";
import { mainButton, plainButton } from "../components/ui";
import { Lang, setLang, useText } from "../lib/lang";
import { useTitle } from "../lib/useTitle";

// Step 0 is the language choice. Steps 1 to 3 are the picture guide, and it can be skipped.
export function Welcome() {
  const t = useText();
  const go = useNavigate();
  const [step, setStep] = useState(0);
  useTitle("Welcome");

  function choose(lang: Lang) {
    setLang(lang);
    setStep(1);
  }
  const finish = () => go("/", { replace: true });

  if (step === 0) {
    return (
      <div className="space-y-6 py-8 text-center">
        <img src="/icon-192.png" alt="" width={120} height={120} className="mx-auto rounded-full bg-white" />
        <h1 className="font-display text-3xl font-extrabold">{t("shopName")}</h1>
        <p>{t("chooseLanguage")}</p>
        <div className="grid gap-3">
          <button className={`${mainButton} min-h-[72px] text-2xl`} onClick={() => choose("or")}>ଓଡ଼ିଆ</button>
          <button className={`${plainButton} min-h-[72px] text-2xl`} onClick={() => choose("hi")}>हिन्दी</button>
          <button className={`${plainButton} min-h-[72px] text-2xl`} onClick={() => choose("en")}>English</button>
        </div>
      </div>
    );
  }

  const slides = [
    { icon: "basket", title: t("step1"), text: t("slide1") },
    { icon: "list", title: t("step2"), text: t("slide2") },
    { icon: "phone", title: t("step3"), text: t("slide3") },
  ];
  const slide = slides[step - 1];
  return (
    <div className="space-y-6 py-8 text-center">
      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-3xl bg-[#FFE9C7] text-saffron-dark"><Icon name={slide.icon} size={96} /></div>
      <h1 className="font-display text-3xl font-extrabold">{slide.title}</h1>
      <p>{slide.text}</p>
      <p aria-label={`${step} / 3`} className="font-bold">{"● ".repeat(step)}{"○ ".repeat(3 - step)}</p>
      <div className="grid gap-3">
        <button className={mainButton} onClick={() => (step === 3 ? finish() : setStep(step + 1))}>{step === 3 ? t("start") : t("next")}</button>
        {step < 3 && <button className="min-h-12 font-bold underline" onClick={finish}>{t("skip")}</button>}
      </div>
    </div>
  );
}

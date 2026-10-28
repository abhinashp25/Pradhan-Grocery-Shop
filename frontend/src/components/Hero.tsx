import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Icon } from "./icons";
import { mainButton } from "./ui";
import { prefersReducedMotion } from "../lib/motion";
import { useText } from "../lib/lang";

export type HeroCard = { slug: string; name: string; icon: string; tint: string };

// The first thing a visitor sees: dark green panel, big words on the left,
// three leaning category cards on the right that float and follow the pointer.
export function Hero({ cards, phone }: { cards: HeroCard[]; phone: string | null }) {
  const t = useText();
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      gsap.set("[data-card]", { rotation: (i: number) => [-6, 5, -2][i] ?? 0, transformPerspective: 1000 });
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from("[data-hero-text] > *", { y: 32, opacity: 0, duration: 0.8, stagger: 0.1 })
        .from("[data-card]", { y: 70, opacity: 0, rotationX: -28, duration: 1, stagger: 0.14, ease: "back.out(1.3)" }, 0.2)
        .from("[data-blob]", { scale: 0.6, opacity: 0, duration: 1.2, stagger: 0.12 }, 0);

      // Gentle floating, each card a little different.
      gsap.to("[data-card]", { y: "-=12", duration: 2.6, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.5, from: "random" } });

      // The big shapes drift slower than the page as you scroll.
      gsap.to("[data-blob]", {
        yPercent: (i: number) => -18 - i * 10,
        ease: "none",
        scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom top", scrub: true },
      });

      // The whole stage turns a little toward the mouse.
      const stage = scope.current!.querySelector<HTMLElement>("[data-stage]");
      if (stage && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const turnY = gsap.quickTo(stage, "rotationY", { duration: 0.8, ease: "power3.out" });
        const turnX = gsap.quickTo(stage, "rotationX", { duration: 0.8, ease: "power3.out" });
        gsap.set(stage, { transformPerspective: 1200 });
        scope.current!.addEventListener("pointermove", (e) => {
          const box = scope.current!.getBoundingClientRect();
          turnY(((e.clientX - box.left) / box.width - 0.5) * 14);
          turnX(-((e.clientY - box.top) / box.height - 0.5) * 10);
        });
      }
    }, scope);
    return () => {
      context.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <section ref={scope} className="relative overflow-hidden rounded-[2rem] bg-forest p-6 text-[#FFF8EC] md:p-10 lg:p-14">
      <div data-blob className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-saffron lg:h-96 lg:w-96" aria-hidden="true" />
      <div data-blob className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-leaf" aria-hidden="true" />
      <div className="relative grid items-center gap-10 lg:grid-cols-2">
        <div data-hero-text className="space-y-5">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] md:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
          <p className="max-w-md text-lg text-[#FFF8EC]/90">{t("heroText")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/c/grocery" className={mainButton}>{t("openGrocery")}</Link>
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex min-h-14 items-center rounded-2xl border-2 border-saffron-light px-6 font-bold hover:bg-[#FFF8EC]/10 active:translate-y-1">
                {t("callShop")}
              </a>
            )}
          </div>
        </div>
        <div data-stage className="relative mx-auto h-[300px] w-full max-w-md lg:h-[400px]">
          {cards.map((card, i) => (
            <Link
              key={card.slug}
              to={`/c/${card.slug}`}
              data-card
              style={{ background: card.tint }}
              className={`absolute flex w-44 items-center gap-3 rounded-3xl p-4 text-[#3A2A1E] shadow-2xl lg:w-56 lg:p-5 ${["left-0 top-0", "right-0 top-24 lg:top-28", "bottom-0 left-10 lg:left-16"][i] ?? ""}`}
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white text-forest"><Icon name={card.icon} size={26} /></span>
              <span className="font-display text-xl font-extrabold leading-tight">{card.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

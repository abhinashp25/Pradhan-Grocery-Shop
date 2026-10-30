import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../lib/motion";
import { useLang, useText } from "../lib/lang";

// icon and groups are accepted so the pages that use this hero do not need to change.
type Props = { slug: string; name: string; tint: string; count: number | null; blurb: string; icon?: string; groups?: string[] };

// Odia and Hindi letters have marks high above and low below the line, so they get a smaller
// size and a taller line than English. This keeps the tops of the letters from being cut off.
const titleStyle = {
  en: "text-5xl leading-[1.1] tracking-tight lg:text-7xl lg:tracking-[-0.02em]",
  hi: "text-4xl leading-[1.3] lg:text-6xl",
  or: "text-4xl leading-[1.45] lg:text-6xl",
} as const;

// The top of every category page.
// Background image: put a file called  frontend/public/hero/<slug>.webp  (for example grocery.webp).
// It is used automatically. With no file, the colour of the category is shown.
export function CategoryHero({ slug, name, tint, count, blurb }: Props) {
  const t = useText();
  const lang = useLang();
  const scope = useRef<HTMLElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const [hasImage, setHasImage] = useState(false);
  const image = `/hero/${slug}.webp`;

  // Find out whether the owner has added a picture for this page.
  useEffect(() => {
    setHasImage(false);
    const probe = new Image();
    probe.onload = () => setHasImage(true);
    probe.src = image;
  }, [image]);

  // The name slides up word by word, then the line below it. Nothing keeps moving afterwards.
  useEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from("[data-word]", { yPercent: 115, duration: 0.9, stagger: 0.09 })
        .from("[data-line]", { y: 22, opacity: 0, duration: 0.7, stagger: 0.1 }, 0.35);

      // The coloured shapes (only when there is no picture) drift a little as the page scrolls.
      const blobs = gsap.utils.toArray<HTMLElement>("[data-blob]");
      if (blobs.length > 0) {
        gsap.from(blobs, { scale: 0.5, opacity: 0, duration: 1.2, stagger: 0.15, ease: "power3.out" });
        gsap.to(blobs, {
          yPercent: (i: number) => -20 - i * 12,
          ease: "none",
          scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom top", scrub: true },
        });
      }
    }, scope);
    return () => {
      context.revert();
      ScrollTrigger.refresh();
    };
  }, [slug, hasImage]);

  // The item count counts up when it arrives.
  useEffect(() => {
    if (count === null || !counter.current) return;
    if (prefersReducedMotion()) {
      counter.current.textContent = String(count);
      return;
    }
    const value = { n: 0 };
    const tween = gsap.to(value, {
      n: count,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => { if (counter.current) counter.current.textContent = String(Math.round(value.n)); },
    });
    return () => {
      tween.kill();
    };
  }, [count, slug]);

  return (
    <section
      ref={scope}
      className="relative isolate flex min-h-64 items-center overflow-hidden rounded-[2rem] p-6 text-[#3A2A1E] md:p-10 lg:min-h-[22rem] lg:p-14"
      style={{
        backgroundImage: `url(${image}), linear-gradient(135deg, ${tint}, color-mix(in srgb, ${tint} 55%, #ffffff))`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {hasImage ? (
        <>
          {/* Phone: heavy tint on the left so text stays readable, fading to transparent on the right so the image shows through. */}
          <div className="absolute inset-0 -z-10 lg:hidden" style={{ background: `linear-gradient(100deg, ${tint} 0%, color-mix(in srgb, ${tint} 90%, transparent) 35%, color-mix(in srgb, ${tint} 50%, transparent) 65%, transparent 100%)` }} aria-hidden="true" />
          {/* Laptop: solid colour behind the words, fading into the picture on the right. */}
          <div className="absolute inset-0 -z-10 hidden lg:block" style={{ background: `linear-gradient(90deg, ${tint} 0%, color-mix(in srgb, ${tint} 88%, transparent) 38%, transparent 78%)` }} aria-hidden="true" />
        </>
      ) : (
        <>
          <div data-blob className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full opacity-40" style={{ background: `color-mix(in srgb, ${tint} 55%, #0e4a2b)` }} aria-hidden="true" />
          <div data-blob className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full opacity-40" style={{ background: `color-mix(in srgb, ${tint} 50%, #f28c0f)` }} aria-hidden="true" />
        </>
      )}

      <div className="max-w-xl">
        {count !== null && (
          <p data-line className="mb-4 text-sm font-bold uppercase tracking-wide">
            <span ref={counter}>{prefersReducedMotion() ? count : 0}</span> {count === 1 ? t("itemOne") : t("itemsCount")}
          </p>
        )}
        <h1 className={`font-display font-extrabold ${titleStyle[lang]}`}>
          {name.split(" ").map((word, i) => (
            <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] pt-[0.2em] align-bottom">
              <span data-word className="inline-block">{word}</span>
            </span>
          ))}
        </h1>
        <p data-line className="mt-4 text-lg font-semibold">{blurb}</p>
      </div>
    </section>
  );
}
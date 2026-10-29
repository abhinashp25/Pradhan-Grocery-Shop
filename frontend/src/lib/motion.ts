// All animation lives here (GSAP). Every effect is skipped when the phone asks for less motion.
import { RefObject, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasMouse = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// A card that leans toward the pointer, in 3D. Only on screens with a mouse.
export function useTilt<T extends HTMLElement>(strength = 6) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !hasMouse()) return;
    gsap.set(el, { transformPerspective: 900 });
    const turnX = gsap.quickTo(el, "rotationX", { duration: 0.45, ease: "power3.out" });
    const turnY = gsap.quickTo(el, "rotationY", { duration: 0.45, ease: "power3.out" });
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      turnY(((event.clientX - box.left) / box.width - 0.5) * strength * 2);
      turnX(-((event.clientY - box.top) / box.height - 0.5) * strength * 2);
    };
    const leave = () => { turnX(0); turnY(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform" });
    };
  }, [strength]);
  return ref;
}

// Items marked data-reveal rise into place once, as they scroll into view.
// Only use it on content that is already on the page when it first draws.
export function useScrollReveal(scope: RefObject<HTMLElement>, when: string = "ready") {
  useEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      gsap.set(items, { opacity: 0, y: 28 });
      ScrollTrigger.batch(items, {
        start: "top 90%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out", clearProps: "opacity" }),
      });
    }, scope);
    return () => context.revert();
  }, [scope, when]);
}

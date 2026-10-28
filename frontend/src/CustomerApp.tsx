import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Route, Routes, useLocation } from "react-router-dom";
import { AudioHelp } from "./components/AudioHelp";
import { BottomBar } from "./components/BottomBar";
import { BackButton } from "./components/BackButton";
import { BackToTop, CookieNotice, OfflineBar, ScrollProgress } from "./components/Chrome";
import { CallPill } from "./components/CallPill";
import { Footer } from "./components/Footer";
import { RequireCustomer } from "./components/Guards";
import { Header } from "./components/Header";
import { fetchShop } from "./lib/api";
import { useText } from "./lib/lang";
import { prefersReducedMotion } from "./lib/motion";
import { useLoad } from "./lib/useLoad";
import { Account } from "./pages/Account";
import { Category } from "./pages/Category";
import { CreditBook } from "./pages/CreditBook";
import { Help } from "./pages/Help";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { MyList } from "./pages/MyList";
import { NotFound } from "./pages/NotFound";
import { ProductDetail } from "./pages/ProductDetail";
import { SavedLists } from "./pages/SavedLists";
import { Search } from "./pages/Search";
import { ShopInfo } from "./pages/ShopInfo";
import { Welcome } from "./pages/Welcome";
import { Xerox } from "./pages/Xerox";

// Everything a customer sees.
export default function CustomerApp() {
  const t = useText();
  const { pathname } = useLocation();
  const clip = ({ "/": "home", "/search": "search", "/list": "mylist", "/login": "login", "/credit": "creditbook" } as Record<string, string>)[pathname];
  const shop = useLoad(fetchShop, []).data;
  const mainRef = useRef<HTMLElement>(null);
  // Shop pages use the whole laptop width. Forms and lists stay narrow so they are easy to read.
  const wide = pathname === "/" || pathname.startsWith("/c/") || pathname === "/search" || pathname.startsWith("/p/");

  // A short, smooth change between pages. Skipped when the phone asks for less motion.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!mainRef.current || prefersReducedMotion()) return;
    const tween = gsap.fromTo(mainRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "opacity,transform" });
    return () => {
      tween.kill();
    };
  }, [pathname]);
  return (
    <>
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-saffron focus:px-4 focus:py-2 focus:font-bold focus:text-[#3A2A1E]">
        {t("skipToContent")}
      </a>
      <ScrollProgress />
      <Header />
      <OfflineBar />
      <main ref={mainRef} id="main" className={`mx-auto px-4 pb-8 pt-4 lg:px-8 lg:pt-8 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>
        {pathname !== "/" && pathname !== "/welcome" && <div className="mb-4"><BackButton fallback="/" /></div>}
        {clip && <AudioHelp clip={clip} />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/c/:slug" element={<Category />} />
          <Route path="/p/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/list" element={<MyList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/credit" element={<RequireCustomer><CreditBook /></RequireCustomer>} />
          <Route path="/saved" element={<RequireCustomer><SavedLists /></RequireCustomer>} />
          <Route path="/shop-info" element={<ShopInfo />} />
          <Route path="/help" element={<Help />} />
          <Route path="/xerox" element={<Xerox />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer shop={shop ?? null} />
      <CookieNotice />
      <BackToTop />
      <CallPill phone={shop?.phone ?? null} />
      <BottomBar />
    </>
  );
}

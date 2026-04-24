import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { homeForRoles } from "@/lib/roleHome";
import { toPublicUrl } from "@/lib/assets";
import AOS from "aos";
import "aos/dist/aos.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { LayoutDashboard, LogIn } from "lucide-react";

function pickNutrition(n) {
  const o = n ?? {};
  const kcal =
    o.energy_kcal ??
    o.kcal ??
    o.calories ??
    o.calories_kcal ??
    o.energy ??
    null;
  const protein = o.protein_g ?? o.protein ?? null;
  const carbs = o.carbs_g ?? o.carb_g ?? o.carbs ?? null;
  const fat = o.fat_g ?? o.fat ?? null;
  return { kcal, protein, carbs, fat };
}

function short(s, max = 88) {
  const v = String(s ?? "").trim();
  if (!v) return "";
  if (v.length <= max) return v;
  return v.slice(0, max - 1).trimEnd() + "…";
}

function guessProteinType(p) {
  const s = `${p?.category?.name ?? ""} ${p?.name ?? ""}`.toLowerCase();
  if (s.includes("beef") || s.includes("sapi")) return "Beef";
  if (
    s.includes("fish") ||
    s.includes("dori") ||
    s.includes("salmon") ||
    s.includes("tuna")
  )
    return "Fish";
  return "Chicken";
}

const COPY = {
  metaTitle: "Flame Street — Real Protein, Anti Basa-Basi",
  brand: {
    nameA: "Flame",
    nameB: "Street",
    tagline: "Real Protein. Anti Basa-Basi.",
  },
  nav: [
    { key: "home", label: "Home" },
    { key: "about", label: "About" },
    { key: "catalog", label: "Catalog" },
    { key: "flame-fit", label: "Flame Fit" },
  ],
  buttons: {
    orderNow: "Order Now",
    dashboard: "Dashboard",
    menu: "Menu",
    allProducts: "All Products",
    theStory: "The Story",
    viewFullMenu: "View Full Menu",
    viewAll: "View all",
    browseMenu: "Browse Menu",
    startOrdering: "Start Ordering",
  },
  home: {
    badge: "High-Protein Status • Microwave Friendly",
    headlineA: "REAL PROTEIN,",
    headlineB: "ANTI BASA-BASI.",
    descA:
      "Dada ayam bakar glistening, charcoal grilled, dan macro yang nggak bikin debat.",
    descB: "Panas 2 menit. Makan. Repeat.",
    stats: {
      avgProteinLabel: "Avg Protein",
      avgProteinValue: "40g+",
      prepTimeLabel: "Prep Time",
      prepTimeValue: "2 MIN",
      methodLabel: "Method",
      methodValue: "Charcoal",
    },
    partnersTitleA: "Official",
    partnersTitleB: "Gym Partners",
    partnersTitleC: "Network",
    blueprintTitleA: "3 Pilar",
    blueprintTitleB: "Flame Street",
    eliteTitleA: "Product",
    eliteTitleB: "Banger",
    testimonials: {
      kicker: "Field Reports",
      titleA: "Gym Rats",
      titleB: "Said.",
      badge: "Real Feedback • No Sugar Coating",
      footer: "Join 500+ Gym Rats who fueled their gains with us.",
      items: [
        {
          name: 'Raka "PR Hunter"',
          role: "Powerlifter",
          tag: "Mass Gain",
          text: "Microwave 2 menit, langsung kejar protein. Rasanya bukan makanan sedih yang hambar. Ini bahan bakar beneran.",
        },
        {
          name: 'Mika "Cut Season"',
          role: "Fitness Model",
          tag: "Shredding",
          text: "Kcal-nya jelas dan dominan. Anak gym butuh angka pasti, bukan puisi. Flame Street kasih apa yang gue butuh.",
        },
        {
          name: 'Dion "Leg Day Survivor"',
          role: "Bodybuilder",
          tag: "Recovery",
          text: "Charcoal grilled-nya kerasa banget. Clean tapi tetap nendang. Pas buat recovery setelah sesi kaki yang brutal.",
        },
      ],
    },
  },
  about: {
    subject: "Subject: Origin Story",
    headingA: "Lahir di",
    headingB: "Gym,",
    headingC: "Besar di",
    headingD: "Dapur.",
    desc: "Flame Street bukan sekadar katering. Kami adalah Infrastruktur Nutrisi bagi mereka yang menganggap tubuh mereka sebagai aset paling berharga.",
    architectKicker: "The Architect",
    architectName: "Evan Grimaldi",
    architectParagraphs: [
      "Flame Street lahir dari rasa frustrasi Evan Grimaldi saat menjalani masa cut season yang brutal. Sulit mencari makanan yang praktis tapi tetap memiliki profil macro yang jujur.",
      'Filosofinya sederhana: "Jangan biarkan nutrisi buruk membunuh hasil latihanmu." Kami membuang semua basa-basi pemasaran dan fokus pada apa yang benar-benar dibutuhkan ototmu.',
    ],
    tags: ["Macro-Obsessed", "Consistency-First", "No-Gimmick Policy"],
    visionKicker: "The Vision",
    visionQuote: '"Protein Cepat. Rasa Serius. Tanpa Ribet."',
    golden: {
      kicker: "Biological Timing",
      titleA: "The",
      titleB: "Golden",
      titleC: "Window.",
      leadStrong: "Don't Waste Your Workout.",
      lead: "Jendela anabolik pasca-latihan sangat krusial. Tubuhmu butuh asupan protein yang cepat diserap untuk memulai perbaikan serat otot yang rusak.",
      primary: "Gas Order Sekarang",
      secondary: "Back to Base",
      cards: [
        {
          no: "01",
          title: "Charcoal Precision",
          desc: "Teknik grill menggunakan arang asli menjaga kadar air dalam daging (juiciness) sambil memberikan aroma smoky yang autentik tanpa lemak tambahan.",
        },
        {
          no: "02",
          title: "2-Minute Deployment",
          desc: "Waktu adalah segalanya. Sistem microwave-friendly kami memastikan makanan siap saji dalam 120 detik, tepat saat ototmu membutuhkannya.",
        },
      ],
    },
    stats: [
      { label: "Avg Protein", value: "40g+", sub: "Per Serving" },
      { label: "Prep Time", value: "2 Min", sub: "Ready to Eat" },
      { label: "Standard", value: "Grade A", sub: "Chicken Breast" },
      { label: "Vibe", value: "Industrial", sub: "Clean Build" },
    ],
    footer: {
      title: "Ready to Optimize Your Gains?",
      link: "Open The Catalog",
    },
    assets: {
      vibeImg:
        "https://revaldyadhitya.com/storage/other/41e1b6e8-79b0-4742-8393-121452c4a252.webp",
    },
  },
  flameFit: {
    badge: "Elite Access Only",
    titleA: "FLAME",
    titleB: "FIT",
    desc: 'Program membership khusus "Gym Rats" yang serius. Nutrisi presisi, diantar langsung ke loker atau resepsionis gym pilihanmu.',
    ctas: {
      join: "Join Membership",
      partners: "Check Partner Gyms",
    },
    logic: {
      kicker: "The Logic",
      titleA: "Zero Friction,",
      titleB: "Maximum Gains.",
      paragraphs: [
        'Masalah klasik member gym: "Habis latihan, belum masak, akhirnya makan sembarangan di jalan."',
        "Flame Fit memutus rantai itu. Kami bekerjasama dengan gym pilihanmu untuk memastikan makanan high-protein kamu sudah menunggu begitu kamu selesai mandi pasca-workout.",
      ],
      cards: [
        {
          title: "Direct Gym Delivery",
          desc: "Lupakan alamat rumah. Makanan langsung diantar ke gym partner tempat kamu latihan.",
        },
        {
          title: "Priority Stock",
          desc: "Member Flame Fit dapat jatah stock duluan untuk menu banger yang sering sold out.",
        },
        {
          title: "Monthly Macro Report",
          desc: "Rekapan total protein, carbs, dan fat yang sudah kamu konsumsi lewat Flame Street.",
        },
      ],
    },
    hubs: {
      titleA: "Delivery",
      titleB: "Hubs.",
      subtitle: "Currently Active Gym Partners",
      badge: "Active Hub",
    },
    form: {
      titleA: "Ready to",
      titleB: "Level Up?",
      desc: "Isi data di bawah, tim kami akan memverifikasi status membership kamu dan menghubungkan akunmu dengan Gym pilihanmu.",
      placeholders: {
        name: "FULL NAME",
        phone: "PHONE NUMBER (WA)",
        gym: "SELECT YOUR GYM HUB",
      },
      submit: "Apply for Membership",
    },
    assets: {
      heroImg:
        "https://revaldyadhitya.com/storage/other/af0b5464-7c17-4c97-ab59-440831c7a49b.webp",
    },
  },
  footer: {
    brandDesc:
      "Premium high-protein meal prep designed for high-performance individuals. Real food, zero fluff.",
    kitchenStatus: "Kitchen Status: Online",
    navigationTitle: "Navigation",
    connectTitle: "Connect",
    navLinks: [
      { key: "home", label: "Home Base" },
      { key: "catalog", label: "Fuel Catalog" },
      { key: "about", label: "The Manifesto" },
    ],
    connectLinks: ["Instagram", "WhatsApp", "GrabFood"],
    ctaTitle: "Ready to grow?",
    ctaDesc:
      "Join our network and start optimizing your nutrition window today.",
    ctaButton: "Order Now",
    bottomLeft: "FLAME STREET • ANTI BASA-BASI",
    bottomRightPrefix: "MADE BY",
    bottomRightName: "EVAN GRIMALDI",
    terms: "Terms",
    privacy: "Privacy",
  },
};

export default function Landing() {
  const [searchParams] = useSearchParams();
  const page = String(searchParams.get("page") ?? "home");

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const appHome = useMemo(() => {
    if (token && user) return homeForRoles(user?.roles ?? []);
    return "/login";
  }, [token, user]);

  const dataQuery = useQuery({
    queryKey: ["landing"],
    queryFn: async () => (await api.get("/landing")).data,
    staleTime: 60_000,
  });

  const products = dataQuery.data?.products ?? [];
  const gyms = dataQuery.data?.gyms ?? [];

  const proteinTypes = useMemo(() => ["All", "Chicken", "Beef", "Fish"], []);

  const productRows = useMemo(() => {
    return products.map((p) => {
      const n = pickNutrition(p.nutritional_info);
      const kcalNum = n.kcal != null ? Number(n.kcal) : null;
      const proteinNum = n.protein != null ? Number(n.protein) : null;
      const carbsNum = n.carbs != null ? Number(n.carbs) : null;
      const fatNum = n.fat != null ? Number(n.fat) : null;
      return {
        ...p,
        imageUrl: p.image ? toPublicUrl(p.image) : null,
        typeLabel: p.category?.name ?? "Meal",
        proteinType: guessProteinType(p),
        kcal: kcalNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      };
    });
  }, [products]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeType, setActiveType] = useState("All");
  const [maxKcal, setMaxKcal] = useState(500);

  const catalogItems = useMemo(() => {
    return productRows.filter((p) => {
      const typeOk = activeType === "All" || p.proteinType === activeType;
      const kcalOk = p.kcal == null ? true : p.kcal <= maxKcal;
      return typeOk && kcalOk;
    });
  }, [productRows, activeType, maxKcal]);

  useEffect(() => {
    document.title = COPY.metaTitle;
  }, []);

  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      offset: 80,
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    if (page === "catalog") {
      setActiveType("All");
      setMaxKcal(500);
    }
  }, [page]);

  const year = new Date().getFullYear();

  const pageLink = (k) => `/?page=${encodeURIComponent(String(k))}`;

  return (
    <div className="bg-base text-white font-sans antialiased selection:bg-flame/30 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-base/75 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
          <Link to={pageLink("home")} className="flex items-center gap-3 group">
            <div
              className="leading-tight"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}
            >
              <div className="font-black tracking-tight text-xl italic">
                {COPY.brand.nameA}
                <span className="text-green-500">{COPY.brand.nameB}</span>
              </div>
              <div className="text-xs text-white/60 -mt-0.5">
                {COPY.brand.tagline}
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {COPY.nav.map((n) => {
              const active = page === n.key;
              return (
                <Link
                  key={n.key}
                  to={pageLink(n.key)}
                  className={[
                    "px-4 py-2 rounded-xl text-sm font-semibold transition",
                    active
                      ? "bg-white/10 border border-white/15"
                      : "text-white/75 hover:text-white hover:bg-white/5 border border-transparent",
                  ].join(" ")}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {token && user ? (
              <Link
                to={appHome}
                className="px-4 py-2 hidden md:inline-block rounded-xl text-sm font-bold bg-flame text-black hover:brightness-110 transition shadow-[0_0_45px_rgba(0,155,34,0.25)]"
              >
                {COPY.buttons.dashboard}
              </Link>
            ) : (
              <Link
                to={pageLink("catalog")}
                className="px-4 py-2 hidden md:inline-block rounded-xl text-sm font-bold bg-flame text-black hover:brightness-110 transition shadow-[0_0_45px_rgba(0,155,34,0.25)]"
              >
                {COPY.buttons.orderNow}
              </Link>
            )}

            <Link
              to={token && user ? appHome : "/login"}
              aria-label={token && user ? "Dashboard" : "Login"}
              className="md:hidden grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            >
              {token && user ? (
                <LayoutDashboard size={18} />
              ) : (
                <LogIn size={18} />
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden px-3 py-2 rounded-xl border border-white/15 bg-white/5"
            >
              <span className="text-sm font-semibold">{COPY.buttons.menu}</span>
            </button>
          </div>
        </div>

        <div
          className={[
            "md:hidden border-t border-white/10 pb-8",
            mobileOpen ? "" : "hidden",
          ].join(" ")}
        >
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2">
            {COPY.nav.map((n) => (
              <Link
                key={n.key}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                to={pageLink(n.key)}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="">
        {page === "home" ? (
          <>
            <section className="relative h-screen min-h-[700px] w-full overflow-hidden -mt-6 md:-mt-8">
              <div className="absolute inset-0 z-0">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                >
                  <source
                    src="https://flamestreet.id/img/video/videobackground.mp4"
                    type="video/mp4"
                  />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-base/60 via-base/20 to-base"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-base via-transparent to-transparent opacity-80"></div>
                <div className="absolute inset-0 noise opacity-20"></div>
              </div>

              <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex flex-col justify-center">
                <div className="max-w-3xl">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-flame/40 bg-flame/10 backdrop-blur-md text-flame text-xs md:text-[10px] font-black tracking-[0.2em] uppercase mb-8"
                    data-aos="fade-right"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-flame"></span>
                    </span>
                    {COPY.home.badge}
                  </div>

                  <h1
                    className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-white"
                    data-aos="fade-up"
                    data-aos-delay="100"
                  >
                    {COPY.home.headlineA}
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-flame to-emerald-400">
                      {COPY.home.headlineB}
                    </span>
                  </h1>

                  <p
                    className="mt-8 text-lg md:text-xl text-white/80 max-w-xl leading-relaxed font-medium"
                    data-aos="fade-up"
                    data-aos-delay="200"
                  >
                    {COPY.home.descA}{" "}
                    <span className="text-white font-bold underline decoration-flame/50">
                      {COPY.home.descB}
                    </span>
                  </p>

                  <div
                    className="mt-10 flex flex-col sm:flex-row gap-4"
                    data-aos="fade-up"
                    data-aos-delay="300"
                  >
                    <Link
                      to={pageLink("catalog")}
                      className="group relative px-8 py-4 rounded-2xl bg-flame text-black font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,155,34,0.4)] flex items-center justify-center gap-3"
                    >
                      {COPY.buttons.allProducts}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </Link>
                    <Link
                      to={pageLink("about")}
                      className="px-8 py-4 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 transition font-bold text-center text-lg"
                    >
                      {COPY.buttons.theStory}
                    </Link>
                  </div>

                  <div
                    className="mt-12 flex flex-wrap gap-8 border-t border-white/10 pt-8"
                    data-aos="fade-up"
                    data-aos-delay="400"
                  >
                    <div>
                      <div className="text-white/50 text-xs font-bold tracking-widest uppercase">
                        {COPY.home.stats.avgProteinLabel}
                      </div>
                      <div className="text-3xl font-black mt-1">
                        {COPY.home.stats.avgProteinValue}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 text-xs font-bold tracking-widest uppercase">
                        {COPY.home.stats.prepTimeLabel}
                      </div>
                      <div className="text-3xl font-black mt-1">
                        {COPY.home.stats.prepTimeValue}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-white/50 text-xs font-bold tracking-widest uppercase">
                        {COPY.home.stats.methodLabel}
                      </div>
                      <div className="text-3xl font-black mt-1 uppercase text-flame">
                        {COPY.home.stats.methodValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden md:block"
                data-aos="fade-up"
                data-aos-delay="600"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30">
                    Scroll
                  </span>
                  <div className="w-[2px] h-12 bg-gradient-to-b from-flame to-transparent rounded-full overflow-hidden">
                    <div className="w-full h-1/2 bg-white animate-scroll-dash"></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-16 relative" data-aos="fade-up">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-white/20"></div>
                <h2 className="text-[10px] md:text-xs font-black tracking-[0.4em] uppercase text-white/40">
                  {COPY.home.partnersTitleA}{" "}
                  <span className="text-flame">{COPY.home.partnersTitleB}</span>{" "}
                  {COPY.home.partnersTitleC}
                </h2>
                <div className="h-px flex-grow bg-gradient-to-l from-transparent via-white/10 to-white/20"></div>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 w-20 md:w-40 bg-gradient-to-r from-base to-transparent z-10 pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-20 md:w-40 bg-gradient-to-l from-base to-transparent z-10 pointer-events-none"></div>

                <div className="overflow-hidden py-4">
                  <div className="flex animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap gap-6">
                    {[...gyms, ...gyms, ...gyms].slice(0, 60).map((g, idx) => (
                      <div
                        key={`${g.id}-${idx}`}
                        className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-flame/30 hover:scale-105 transition-all duration-300"
                      >
                        {g.image ? (
                          <img
                            src={toPublicUrl(g.image)}
                            alt={g.gym_name}
                            className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 border border-white/10"
                          />
                        ) : (
                          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-flame font-black">
                            {(g.gym_name?.[0] ?? "G").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black text-white/80 group-hover:text-white tracking-tight">
                            {g.gym_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-flame animate-pulse"></span>
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                              Verified Hub
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <div className="h-[2px] w-24 bg-flame/20 rounded-full"></div>
              </div>
            </section>

            <section className="mt-20 px-4 md:px-28">
              <div
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
                data-aos="fade-up"
              >
                <div>
                  <div className="flex items-center gap-2 text-flame mb-2">
                    <span className="w-2 h-2 rounded-full bg-flame animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                      Elite Selection
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                    {COPY.home.eliteTitleA}{" "}
                    <span className="text-white/20">
                      {COPY.home.eliteTitleB}
                    </span>
                  </h2>
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    to={pageLink("catalog")}
                    className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
                  >
                    {COPY.buttons.viewFullMenu}
                    <span className="w-10 h-[1px] bg-white/20 group-hover:w-14 group-hover:bg-flame transition-all"></span>
                  </Link>
                </div>
              </div>

              <div className="relative" data-aos="fade-up" data-aos-delay="100">
                <Swiper
                  modules={[Pagination]}
                  pagination={{ clickable: true }}
                  spaceBetween={20}
                  slidesPerView={1}
                  breakpoints={{
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                  }}
                >
                  {productRows.slice(0, 9).map((p) => (
                    <SwiperSlide key={p.id} className="h-auto">
                      <article className="group relative flex flex-col h-full bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-flame/40">
                        <div className="relative h-[400px] overflow-hidden">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="absolute inset-0 h-full w-full object-cover scale-[1.05] group-hover:scale-110 transition duration-700"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-base via-base/40 to-transparent" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent"></div>

                          <div className="absolute top-6 left-6">
                            <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
                              <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">
                                Energy Output
                              </div>
                              <div className="text-2xl font-black text-white leading-none">
                                {p.kcal != null ? p.kcal : "-"}{" "}
                                <span className="text-xs text-flame">KCAL</span>
                              </div>
                            </div>
                          </div>

                          <div className="absolute top-6 right-6">
                            <span className="px-3 py-1 rounded-full border border-flame/30 bg-flame/10 backdrop-blur-md text-flame text-[9px] font-black uppercase tracking-widest">
                              {p.proteinType}
                            </span>
                          </div>
                        </div>

                        <div className="relative -mt-20 px-8 pb-8 flex-grow">
                          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-2xl">
                            <h3 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-flame transition-colors">
                              {p.name}
                            </h3>
                            <p className="text-white/50 text-sm leading-relaxed line-clamp-2 mb-6 font-medium">
                              {short(p.description, 120)}
                            </p>

                            <div className="grid grid-cols-3 gap-3 mb-8">
                              <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                <div className="text-[8px] font-black text-white/30 uppercase mb-1">
                                  Protein
                                </div>
                                <div className="text-sm font-black text-white">
                                  {p.protein != null ? `${p.protein}g` : "-"}
                                </div>
                              </div>
                              <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                <div className="text-[8px] font-black text-white/30 uppercase mb-1">
                                  Carbs
                                </div>
                                <div className="text-sm font-black text-white">
                                  {p.carbs != null ? `${p.carbs}g` : "-"}
                                </div>
                              </div>
                              <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                <div className="text-[8px] font-black text-white/30 uppercase mb-1">
                                  Fat
                                </div>
                                <div className="text-sm font-black text-white">
                                  {p.fat != null ? `${p.fat}g` : "-"}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <Link
                                to={
                                  token && user
                                    ? `/member/product/${p.slug}`
                                    : "/login"
                                }
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-flame text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(0,155,34,0.2)]"
                              >
                                Open Detail
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                  />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </section>

            <section className="mt-20 mb-24 px-4 md:px-28">
              <div
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
                data-aos="fade-up"
              >
                <div>
                  <div className="flex items-center gap-2 text-flame mb-2">
                    <div className="flex gap-1">
                      <div className="w-1 h-3 bg-flame"></div>
                      <div className="w-1 h-3 bg-flame/40"></div>
                      <div className="w-1 h-3 bg-flame/10"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                      {COPY.home.testimonials.kicker}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                    {COPY.home.testimonials.titleA}{" "}
                    <span className="text-white/20">
                      {COPY.home.testimonials.titleB}
                    </span>
                  </h2>
                </div>
                <div className="hidden md:block">
                  <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {COPY.home.testimonials.badge}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {COPY.home.testimonials.items.map((t, i) => (
                  <div
                    key={t.name}
                    className="group relative p-8 rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden transition-all duration-500 hover:border-flame/40 hover:bg-white/[0.07]"
                    data-aos="fade-up"
                    data-aos-delay={100 * (i + 1)}
                  >
                    <div className="absolute -top-4 -left-2 text-9xl font-black text-white/[0.03] select-none group-hover:text-flame/[0.05] transition-colors">
                      “
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex gap-1 mb-6">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <svg
                            key={j}
                            className="w-4 h-4 text-flame"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>

                      <blockquote className="text-xl font-medium text-white/80 leading-relaxed italic mb-8 group-hover:text-white transition-colors">
                        “{t.text}”
                      </blockquote>

                      <div className="mt-auto flex items-center gap-4 pt-6 border-t border-white/5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-flame to-emerald-900 flex items-center justify-center text-black font-black text-xl border-2 border-white/10">
                          {(t.name?.[0] ?? "G").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-white tracking-tight uppercase">
                            {t.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {t.role}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-flame"></span>
                            <span className="text-[10px] font-black text-flame uppercase tracking-tighter">
                              {t.tag}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-flame/5 blur-3xl rounded-full group-hover:bg-flame/10 transition-colors"></div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center" data-aos="fade-up">
                <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">
                  {COPY.home.testimonials.footer}
                </p>
              </div>
            </section>
          </>
        ) : null}

        {page === "catalog" ? (
          <section className="px-4 md:px-28 py-16">
            <div
              className="flex items-end justify-between gap-4 mb-8"
              data-aos="fade-up"
            >
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                  Catalog
                </div>
                <div className="mt-2 text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
                  All Products <span className="text-white/20">Lineup</span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
                Showing{" "}
                <span className="text-white">{catalogItems.length}</span>
              </div>
            </div>

            <div
              className="rounded-[2.5rem] border border-white/10 bg-white/5 p-6 mb-8"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {proteinTypes.map((t) => {
                    const isActive = activeType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveType(t)}
                        className={[
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 transition",
                          isActive
                            ? "bg-flame text-black shadow-[0_0_45px_rgba(0,155,34,0.20)]"
                            : "text-white/70",
                        ].join(" ")}
                      >
                        {t === "All" ? "ALL" : String(t).toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 min-w-[260px]">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                    <span>Max kcal</span>
                    <span className="text-white">{maxKcal}</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={700}
                    value={maxKcal}
                    onChange={(e) => setMaxKcal(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {catalogItems.map((p) => (
                <article
                  key={p.id}
                  className="group relative flex flex-col h-full bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-flame/40"
                  data-aos="fade-up"
                >
                  <div className="relative h-[320px] overflow-hidden">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover scale-[1.05] group-hover:scale-110 transition duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-base via-base/40 to-transparent" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent"></div>

                    <div className="absolute top-6 left-6">
                      <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
                        <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">
                          Energy Output
                        </div>
                        <div className="text-xl font-black text-white leading-none">
                          {p.kcal != null ? p.kcal : "-"}{" "}
                          <span className="text-[10px] text-flame">KCAL</span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-6 right-6">
                      <span className="px-3 py-1 rounded-full border border-flame/30 bg-flame/10 backdrop-blur-md text-flame text-[9px] font-black uppercase tracking-widest">
                        {p.proteinType}
                      </span>
                    </div>
                  </div>

                  <div className="relative -mt-16 px-8 pb-8 flex-grow">
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-2xl">
                      <h3 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-flame transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed line-clamp-3 mb-6 font-medium">
                        {short(p.description, 160)}
                      </p>

                      <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                          <div className="text-[8px] font-black text-white/30 uppercase mb-1">
                            Protein
                          </div>
                          <div className="text-sm font-black text-white">
                            {p.protein != null ? `${p.protein}g` : "-"}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                          <div className="text-[8px] font-black text-white/30 uppercase mb-1">
                            Carbs
                          </div>
                          <div className="text-sm font-black text-white">
                            {p.carbs != null ? `${p.carbs}g` : "-"}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                          <div className="text-[8px] font-black text-white/30 uppercase mb-1">
                            Fat
                          </div>
                          <div className="text-sm font-black text-white">
                            {p.fat != null ? `${p.fat}g` : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Link
                          to={
                            token && user
                              ? `/member/product/${p.slug}`
                              : "/login"
                          }
                          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-flame text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(0,155,34,0.2)]"
                        >
                          Open Detail
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {page === "about" ? (
          <section className="mt-12 mb-24 px-4 md:px-28">
            <div className="relative mb-20" data-aos="fade-up">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-flame font-black tracking-[0.4em] uppercase text-[10px]">
                  {COPY.about.subject}
                </span>
                <div className="h-px flex-grow bg-white/10"></div>
              </div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase italic">
                {COPY.about.headingA}{" "}
                <span className="text-white/20 text-not-italic">
                  {COPY.about.headingB}
                </span>
                <br />
                {COPY.about.headingC}{" "}
                <span className="text-flame">{COPY.about.headingD}</span>
              </h1>
              <p className="text-white/50 mt-8 max-w-2xl text-lg md:text-xl leading-relaxed font-medium">
                {COPY.about.desc}
              </p>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-20">
              <div
                className="lg:col-span-7 group relative rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-12 overflow-hidden transition-all duration-500 hover:border-flame/40"
                data-aos="fade-right"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <svg
                    width="200"
                    height="200"
                    viewBox="0 0 100 100"
                    fill="none"
                    stroke="white"
                  >
                    <path
                      d="M10 10h80v80h-80zM10 50h80M50 10v80"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-flame/10 border border-flame/20 text-flame text-[10px] font-black tracking-widest uppercase mb-8">
                    {COPY.about.architectKicker}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic mb-6">
                    {COPY.about.architectName}
                  </h2>

                  <div className="space-y-6 text-white/60 text-lg leading-relaxed">
                    {COPY.about.architectParagraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>

                  <div className="mt-10 flex flex-wrap gap-3">
                    {COPY.about.tags.map((tag) => (
                      <div
                        key={tag}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest"
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="lg:col-span-5 rounded-[2.5rem] border border-white/10 overflow-hidden relative group"
                data-aos="fade-left"
              >
                <img
                  src={COPY.about.assets.vibeImg}
                  alt="Flame Street vibe"
                  className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-base via-base/20 to-transparent"></div>
                <div className="relative p-8 h-full flex flex-col justify-end">
                  <div className="bg-base/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="text-flame text-[10px] font-black tracking-[0.3em] uppercase mb-2">
                      {COPY.about.visionKicker}
                    </div>
                    <div className="text-2xl font-black text-white italic uppercase leading-tight">
                      {COPY.about.visionQuote}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="golden-window"
              className="relative rounded-[3rem] border border-white/10 bg-white/5 overflow-hidden p-8 md:p-16 mb-20"
              data-aos="fade-up"
            >
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(white 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 text-flame mb-6">
                    <span className="w-12 h-px bg-flame"></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                      {COPY.about.golden.kicker}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9] mb-8">
                    {COPY.about.golden.titleA}{" "}
                    <span className="text-flame">
                      {COPY.about.golden.titleB}
                    </span>{" "}
                    <br />
                    {COPY.about.golden.titleC}
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed mb-8">
                    <strong className="text-white font-black italic uppercase">
                      {COPY.about.golden.leadStrong}
                    </strong>
                    <br />
                    {COPY.about.golden.lead}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to={pageLink("catalog")}
                      className="px-8 py-4 rounded-2xl bg-flame text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition shadow-[0_10px_40px_rgba(0,155,34,0.3)] text-center"
                    >
                      {COPY.about.golden.primary}
                    </Link>
                    <Link
                      to={pageLink("home")}
                      className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-xs font-black uppercase tracking-widest text-center text-white/60 hover:text-white"
                    >
                      {COPY.about.golden.secondary}
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {COPY.about.golden.cards.map((card) => (
                    <div
                      key={card.no}
                      className="bg-base/40 border border-white/10 p-6 rounded-3xl hover:border-flame/40 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl font-black text-flame/30 italic">
                          {card.no}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                            {card.title}
                          </h3>
                          <p className="text-sm text-white/50 leading-relaxed">
                            {card.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              data-aos="fade-up"
            >
              {COPY.about.stats.map((s) => (
                <div
                  key={s.label}
                  className="p-8 rounded-[2.5rem] border border-white/10 bg-white/5 text-center group hover:bg-flame/5 transition-colors duration-500"
                >
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">
                    {s.label}
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-white group-hover:text-flame transition-colors">
                    {s.value}
                  </div>
                  <div className="text-[10px] font-bold text-white/20 uppercase mt-1">
                    {s.sub}
                  </div>
                </div>
              ))}
            </section>

            <div className="mt-24 text-center" data-aos="fade-up">
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-8">
                {COPY.about.footer.title}
              </h2>
              <div className="flex justify-center">
                <Link
                  to={pageLink("catalog")}
                  className="group flex items-center gap-4 text-flame font-black uppercase tracking-[0.3em] text-sm"
                >
                  {COPY.about.footer.link}
                  <span className="w-16 h-px bg-flame group-hover:w-24 transition-all"></span>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {page === "flame-fit" ? (
          <section className="mb-24 overflow-x-hidden">
            <div
              className="relative px-4 md:px-28 border border-white/10 overflow-hidden p-8 md:p-24 text-center group"
              data-aos="fade-up"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={COPY.flameFit.assets.heroImg}
                  alt="Gym Background"
                  className="h-full w-full object-cover scale-[1.05] group-hover:scale-110 transition duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-base/40 via-base/30 to-base"></div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-flame/30 bg-flame/10 backdrop-blur-md text-flame text-[10px] font-black tracking-[0.4em] uppercase mb-10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-flame"></span>
                  </span>
                  {COPY.flameFit.badge}
                </div>

                <h1 className="text-6xl md:text-8xl font-black uppercase italic mb-8 text-white">
                  {COPY.flameFit.titleA}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-flame to-emerald-400 text-not-italic">
                    {COPY.flameFit.titleB}
                  </span>
                </h1>

                <p className="text-white/80 text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed font-medium mb-12">
                  {COPY.flameFit.desc}
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-5">
                  <a
                    href="#join"
                    className="px-10 py-5 rounded-2xl bg-flame text-black font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,155,34,0.4)]"
                  >
                    {COPY.flameFit.ctas.join}
                  </a>
                  <a
                    href="#gym-partners"
                    className="px-10 py-5 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all text-sm font-black uppercase tracking-widest text-white"
                  >
                    {COPY.flameFit.ctas.partners}
                  </a>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-flame to-transparent opacity-50"></div>
            </div>

            <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-4 md:px-28">
              <div data-aos="fade-right">
                <div className="flex items-center gap-3 text-flame mb-6">
                  <span className="w-12 h-px bg-flame"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                    {COPY.flameFit.logic.kicker}
                  </span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-8">
                  {COPY.flameFit.logic.titleA} <br />{" "}
                  <span className="text-white/30">
                    {COPY.flameFit.logic.titleB}
                  </span>
                </h2>
                <div className="space-y-6 text-white/60 text-lg leading-relaxed font-medium">
                  {COPY.flameFit.logic.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4" data-aos="fade-left">
                {COPY.flameFit.logic.cards.map((card) => (
                  <div
                    key={card.title}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 flex gap-6 items-start group hover:border-flame/40 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-flame/10 flex items-center justify-center shrink-0">
                      <span className="text-flame font-black">F</span>
                    </div>
                    <div>
                      <h3 className="text-white font-black uppercase italic tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-sm text-white/40 mt-1">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section id="gym-partners" className="mt-32 px-4 md:px-28">
              <div className="text-center mb-12" data-aos="fade-up">
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">
                  {COPY.flameFit.hubs.titleA}{" "}
                  <span className="text-flame">
                    {COPY.flameFit.hubs.titleB}
                  </span>
                </h2>
                <p className="text-white/40 mt-4 uppercase text-xs font-black tracking-[0.3em]">
                  {COPY.flameFit.hubs.subtitle}
                </p>
              </div>

              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                data-aos="fade-up"
              >
                {gyms.slice(0, 16).map((g) => (
                  <div
                    key={g.id}
                    className="group relative rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col items-center text-center transition-all hover:border-flame/40"
                  >
                    {g.image ? (
                      <img
                        src={toPublicUrl(g.image)}
                        alt={g.gym_name}
                        className="h-16 w-16 rounded-2xl object-cover mb-4 grayscale group-hover:grayscale-0 transition-all"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 mb-4 flex items-center justify-center text-flame font-black text-xl">
                        {(g.gym_name?.[0] ?? "G").toUpperCase()}
                      </div>
                    )}
                    <div className="font-black text-white uppercase text-sm tracking-tight">
                      {g.gym_name}
                    </div>
                    <div className="text-[10px] text-flame font-bold uppercase mt-1 tracking-widest italic">
                      {COPY.flameFit.hubs.badge}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="join"
              className="mt-32 px-4 md:px-28 relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-8 md:p-16"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden lg:block">
                <svg
                  width="300"
                  height="300"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="white"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="0.5"
                    strokeDasharray="4 2"
                  />
                  <path d="M50 10v80M10 50h80" strokeWidth="0.2" />
                </svg>
              </div>

              <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-none mb-6">
                  {COPY.flameFit.form.titleA} <br />
                  <span className="text-flame">
                    {COPY.flameFit.form.titleB}
                  </span>
                </h2>
                <p className="text-white/60 text-lg mb-10 font-medium">
                  {COPY.flameFit.form.desc}
                </p>

                <form action="#" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder={COPY.flameFit.form.placeholders.name}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-flame/50 transition-all font-bold text-sm"
                    />
                    <input
                      type="text"
                      placeholder={COPY.flameFit.form.placeholders.phone}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-flame/50 transition-all font-bold text-sm"
                    />
                  </div>
                  <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/50 focus:outline-none focus:border-flame/50 transition-all font-bold text-sm appearance-none">
                    <option value="">
                      {COPY.flameFit.form.placeholders.gym}
                    </option>
                    {gyms.map((g) => (
                      <option key={g.id} value={g.gym_name}>
                        {String(g.gym_name ?? "").toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full py-5 rounded-2xl bg-flame text-black font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 transition shadow-[0_10px_40px_rgba(0,155,34,0.3)]"
                  >
                    {COPY.flameFit.form.submit}
                  </button>
                </form>
              </div>
            </section>
          </section>
        ) : null}
      </main>

      <footer className="relative mt-20 border-t border-white/10 bg-base overflow-hidden">
        <div className="absolute -bottom-12 -left-10 select-none pointer-events-none">
          <h2 className="text-[12rem] md:text-[20rem] font-black text-white/[0.02] leading-none tracking-tighter">
            STREET
          </h2>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8">
            <div className="space-y-6">
              <div>
                <Link
                  to={pageLink("home")}
                  className="text-2xl font-black tracking-tighter flex items-center gap-2"
                >
                  <span className="w-8 h-8 rounded-lg bg-flame flex items-center justify-center text-black italic">
                    F
                  </span>
                  FLAME STREET
                </Link>
                <p className="mt-4 text-white/50 text-sm leading-relaxed max-w-xs font-medium">
                  {COPY.footer.brandDesc}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-flame"></span>
                </span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  {COPY.footer.kitchenStatus}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8">
                {COPY.footer.navigationTitle}
              </h4>
              <ul className="space-y-4">
                {COPY.footer.navLinks.map((l) => (
                  <li key={l.key}>
                    <Link
                      to={pageLink(l.key)}
                      className="text-sm font-bold text-white/50 hover:text-flame transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8">
                {COPY.footer.connectTitle}
              </h4>
              <ul className="space-y-4">
                {COPY.footer.connectLinks.map((label) => (
                  <li key={label}>
                    <a
                      href="#"
                      className="group flex items-center gap-3 text-sm font-bold text-white/50 hover:text-white transition-colors"
                    >
                      <span className="w-8 h-px bg-white/10 group-hover:bg-flame transition-all"></span>{" "}
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">
                  {COPY.footer.ctaTitle}
                </h4>
                <p className="text-xs text-white/40 leading-relaxed mb-6 font-medium">
                  {COPY.footer.ctaDesc}
                </p>
                <Link
                  to={pageLink("catalog")}
                  className="flex items-center justify-center w-full py-3 rounded-xl bg-flame text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(0,155,34,0.2)]"
                >
                  {COPY.footer.ctaButton}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
              © {year} {COPY.footer.bottomLeft}
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {COPY.footer.terms}
                </span>
              </div>
              <Link to="/privacy-policy" className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {COPY.footer.privacy}
                </span>
              </Link>
            </div>

            <div className="text-[10px] font-bold text-white/40">
              {COPY.footer.bottomRightPrefix}{" "}
              <span className="text-white hover:text-flame transition-colors cursor-pointer">
                {COPY.footer.bottomRightName}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

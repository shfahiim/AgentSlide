"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Sparkles,
  Presentation,
  Globe,
  Network,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Glow() {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
      )}
      aria-hidden="true"
    >
      <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400/15 via-sky-400/10 to-violet-500/15 blur-3xl" />
      <div className="absolute -bottom-24 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300/10 via-rose-400/10 to-emerald-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(17,24,39,0.07)_1px,transparent_0)] [background-size:22px_22px] opacity-60" />
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/70 backdrop-blur-sm p-6 shadow-sm shadow-zinc-900/5">
      <div className="size-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-200/60">
        <Icon className="size-5 text-white" />
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-1 text-sm text-zinc-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 relative">
      <Glow />

      <header className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-9 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">AgentSlide</div>
              <div className="text-[11px] font-semibold text-zinc-400">
                Light-mode studio
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/create"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-100 border border-zinc-200 bg-white/70 backdrop-blur-sm transition-colors"
            >
              Quick Create
            </Link>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-colors"
            >
              Open Studio <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-white/70 backdrop-blur-sm text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              <Zap className="size-3.5 text-emerald-500" />
              AI-powered slide + web generation
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900">
              Build decks that look engineered — not generated.
            </h1>
            <p className="mt-4 text-lg text-zinc-600 leading-relaxed">
              AgentSlide turns a prompt into a validated deck spec, then renders
              consistent PPTX and web slides with charts that match your theme.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/studio"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-colors"
              >
                Launch Studio <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-zinc-700 bg-white/70 backdrop-blur-sm border border-zinc-200 hover:bg-zinc-100 transition-colors"
              >
                Quick Create
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { k: "IR", v: "DeckSpec JSON" },
                { k: "Outputs", v: "PPTX + Web" },
                { k: "Charts", v: "Theme-aware Vega" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-2xl border border-zinc-200 bg-white/70 backdrop-blur-sm px-4 py-3"
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {s.k}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Feature
              icon={Presentation}
              title="Slides that stay readable"
              desc="Hard limits + QA compression prevent crowded slides. Layouts are deterministic across renders."
            />
            <Feature
              icon={Globe}
              title="Interactive web decks"
              desc="Same IR renders to a web presentation, with responsive themed charts and smooth transitions."
            />
            <Feature
              icon={Network}
              title="Knowledge graphs"
              desc="Explore topics as connected concepts — great for study maps, research overviews, and onboarding."
            />
            <Feature
              icon={ShieldCheck}
              title="Structured, validated outputs"
              desc="Gemini responses are validated with Zod schemas so downstream renderers stay reliable."
            />
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-700">AgentSlide</span>{" "}
            · Light mode by default
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300">
            Powered by Gemini · Rendered locally
          </div>
        </div>
      </footer>
    </main>
  );
}

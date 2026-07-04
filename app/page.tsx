"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { signInWithGithub } from "@/features/auth/actions";
import { useRouter } from "next/navigation";
import { 
  Sparkle,
  ChatTeardropText,
  FileCode,
  Kanban,
  GitMerge,
  RocketLaunch,
  ArrowRight,
  Play,
  CheckCircle,
  Cpu,
  GithubLogo,
  SignOut
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Handle user logout
  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Logged out successfully");
            router.push("/");
            router.refresh();
          },
        },
      });
    } catch (error) {
      console.error("Signout error:", error);
      toast.error("Failed to log out");
    }
  };

  // Steps data for the interactive explore playground
  const steps = [
    {
      id: 1,
      title: "Discovery Chat",
      icon: ChatTeardropText,
      badge: "Clarify Requirements",
      heading: "Clarify Feature Requirements",
      description: "ShipFlow AI runs a turn-by-turn chat with you to clarify goals, tech stack constraints, and user flows before writing code."
    },
    {
      id: 2,
      title: "AI spec (PRD)",
      icon: FileCode,
      badge: "PRD Specs",
      heading: "Draft Comprehensive PRDs",
      description: "The AI Analyst automatically compiles requirements into a rich PM-ready PRD covering schema designs, mock layouts, and REST APIs."
    },
    {
      id: 3,
      title: "Kanban Planning",
      icon: Kanban,
      badge: "Task Board",
      heading: "Automated Developer Tasks",
      description: "Upon PRD approval, the AI breaks down the specifications into granular tasks (migrations, APIs, UI layout) on your Kanban task board."
    },
    {
      id: 4,
      title: "AI Code Review",
      icon: GitMerge,
      badge: "PR Reviews",
      heading: "Continuous PR Evaluation",
      description: "When developers submit pull requests, the AI Agent reviews code changes directly against the PRD to verify alignment and security."
    },
    {
      id: 5,
      title: "Release Approved",
      icon: RocketLaunch,
      badge: "Delivery Status",
      heading: "Continuous Delivery Pipeline",
      description: "The release checklist is automatically checked off. The feature is marked ready to ship, and DORA metrics are calculated."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#FF570A]/30 selection:text-[#FF570A] overflow-x-hidden font-sans relative">
      
      {/* Background glowing gradient overlay (CodeRabbit style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[700px] bg-gradient-to-b from-[#FF570A]/5 via-transparent to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/85 backdrop-blur-md border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6 md:px-12">
          
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-8 rounded-lg bg-gradient-to-tr from-[#FF570A] to-[#FF8C39] flex items-center justify-center text-white shadow-lg shadow-[#FF570A]/20 transition-transform group-hover:scale-105 duration-200">
              <Sparkle size={18} weight="fill" className="text-white animate-pulse" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              ShipFlow<span className="text-[#FF570A]">.ai</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-white/70">
            <a href="#playground" className="hover:text-white transition-colors">Products</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Button 
                  render={<Link href="/dashboard" />} 
                  size="sm" 
                  className="bg-transparent border border-white/10 text-white/80 hover:bg-white/5 rounded-lg font-bold text-xs h-9 px-4"
                >
                  Dashboard
                </Button>
                <Button 
                  onClick={handleSignOut}
                  size="sm" 
                  className="bg-transparent border border-rose-500/20 text-rose-400 hover:bg-rose-500/5 rounded-lg font-bold text-xs h-9 px-4 flex items-center gap-1.5 cursor-pointer"
                >
                  <SignOut size={14} />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  render={<Link href="/sign-in" />}
                  size="sm" 
                  className="bg-transparent border border-white/10 text-white/80 hover:bg-white/5 rounded-lg font-bold text-xs h-9 px-4 cursor-pointer"
                >
                  Log In
                </Button>
                
                <Button 
                  render={<Link href="/sign-in" />}
                  size="sm" 
                  className="bg-[#FF570A] hover:bg-[#E04B00] text-white rounded-lg font-extrabold text-xs h-9 px-5 shadow-lg shadow-[#FF570A]/15 cursor-pointer border-none"
                >
                  Try for Free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center space-y-8">
        
        {/* CodeRabbit style decorative lines wrapper */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vw] h-[150vh] -z-20 opacity-20 pointer-events-none select-none">
          <svg viewBox="0 0 1000 1000" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="500" cy="500" rx="350" ry="180" stroke="#FF570A" strokeWidth="0.8" strokeDasharray="6 12" />
            <circle cx="500" cy="500" r="280" stroke="#FF570A" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="max-w-4xl text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-white">
          Cut feature planning &amp; <br/>
          <span className="text-[#FF570A]">code reviews in half, instantly.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-sm sm:text-base text-white/70 font-medium leading-relaxed">
          Reviews and planning for AI-powered teams who move fast. Clarify requirements, draft technical PRDs, create Kanban tasks, and review pull requests.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col items-center gap-4 pt-2">
          {session ? (
            <Button 
              render={<Link href="/dashboard" />} 
              size="lg" 
              className="bg-[#FF570A] hover:bg-[#E04B00] text-white rounded-lg font-bold text-sm h-14 px-8 shadow-xl shadow-[#FF570A]/20 flex items-center gap-2"
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : (
            <Button 
              render={<Link href="/sign-in" />}
              size="lg" 
              className="bg-[#FF570A] hover:bg-[#E04B00] text-white rounded-lg font-bold text-sm h-14 px-8 shadow-xl shadow-[#FF570A]/20 flex items-center gap-2 cursor-pointer border-none"
            >
              <span>Try it for free</span>
              <svg width="10" height="14" viewBox="0 0 14 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 20H0V16H4V20ZM9 16H5V12H9V16ZM14 12H10V8H14V12ZM9 8H5V4H9V8ZM4 4H0V0H4V4Z" fill="white" />
              </svg>
            </Button>
          )}

          <div className="flex items-center gap-2 text-xs text-white/50 font-mono mt-1">
            <span>2-click install</span>
            <span>|</span>
            <span className="flex items-center gap-1">
              <GithubLogo size={14} weight="fill" className="text-white" />
              <span>Works with GitHub</span>
            </span>
          </div>
        </div>
      </section>

      {/* Leader stats section (CodeRabbit Leader block) */}
      <section className="py-12 px-6 max-w-7xl mx-auto border-t border-white/[0.04] text-center">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#FF570A] mb-8">
          The leader in AI product engineering
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-1">
            <p className="text-3xl font-black text-white">15,000+</p>
            <p className="text-xs font-bold text-zinc-500 uppercase font-mono">Features Planned</p>
          </div>
          <div className="p-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-1">
            <p className="text-3xl font-black text-white">500,000+</p>
            <p className="text-xs font-bold text-zinc-500 uppercase font-mono">Tasks Generated</p>
          </div>
          <div className="p-6 bg-[#FF570A]/5 border border-[#FF570A]/10 rounded-2xl space-y-1">
            <p className="text-3xl font-black text-[#FF570A]">9.6</p>
            <p className="text-xs font-bold text-zinc-400 uppercase font-mono">Features Shipped / week</p>
          </div>
        </div>
      </section>

      {/* Interactive explore / playground section */}
      <section id="playground" className="w-full max-w-7xl mx-auto px-6 md:px-12 py-20 border-t border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#FF570A]">
            Interactive Playground
          </p>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            See how ShipFlow AI builds your software
          </h2>
          <p className="text-sm text-white/50">
            Click through the steps of the agentic feature delivery cycle below.
          </p>
        </div>

        {/* Playground Grid: Step Selectors + Workspace Preview Window */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] items-start">
          
          {/* Step buttons */}
          <div className="flex flex-row lg:flex-col overflow-x-auto gap-2 p-1.5 bg-white/[0.02] border border-white/[0.04] rounded-xl lg:h-fit shrink-0 scrollbar-none">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id as any)}
                  className={`flex items-center gap-3 w-full shrink-0 px-4 py-3 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-[#FF570A] text-white font-bold" 
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Visual Workspace Preview Window */}
          <div className="border border-white/[0.04] rounded-2xl bg-white/[0.02] overflow-hidden shadow-2xl min-h-[480px] flex flex-col">
            
            {/* Header inside window */}
            <div className="bg-black/35 px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500/20 border border-red-500/30" />
                <div className="size-3 rounded-full bg-amber-500/20 border border-amber-500/30" />
                <div className="size-3 rounded-full bg-green-500/20 border border-green-500/30" />
              </div>
              <div className="text-[10px] font-mono text-white/30 ml-4 max-w-sm truncate bg-[#0A0A0A] px-3 py-1 rounded border border-white/[0.04]">
                shipflow.ai/dashboard/project/feature-discovery
              </div>
            </div>

            {/* Workspace Content rendering step information */}
            <div className="flex-1 p-6 font-sans text-sm flex flex-col justify-between">
              
              <div className="space-y-1 mb-4 text-left">
                <h4 className="text-[#FF570A] font-extrabold text-xs uppercase tracking-wider font-mono">
                  {steps[activeStep - 1].badge}
                </h4>
                <h3 className="text-base font-bold text-white">{steps[activeStep - 1].heading}</h3>
                <p className="text-xs text-white/60 leading-relaxed font-medium">
                  {steps[activeStep - 1].description}
                </p>
              </div>

              {/* Sub-components mapping workspace visual mockups */}
              <div className="flex-1 flex flex-col justify-center font-mono">
                
                {activeStep === 1 && (
                  <div className="space-y-4 max-w-xl text-xs text-left">
                    <div className="flex items-start gap-3">
                      <div className="size-7 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">U</div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 max-w-md">
                        <p className="text-white font-medium text-xs">User Request</p>
                        <p className="text-white/80 mt-1">I want to integrate a dark mode toggle button in the navbar.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="size-7 rounded bg-[#FF570A] text-white flex items-center justify-center text-[10px] font-extrabold">PM</div>
                      <div className="bg-[#FF570A]/10 p-3 rounded-lg border border-[#FF570A]/20 max-w-md">
                        <p className="text-[#FF570A] font-medium text-xs">AI PM Agent</p>
                        <p className="text-white/90 mt-1">Should the dark mode toggle switch automatically based on the user&apos;s system preferences as well, or only manually?</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="bg-black/40 border border-white/[0.04] p-4 rounded-xl max-w-2xl text-xs text-left">
                    <div className="flex justify-between items-center text-[9px] text-white/40 border-b border-white/[0.04] pb-2 mb-2">
                      <span>PRD Markdown Spec</span>
                      <span className="text-[#FF570A] font-bold uppercase">Status: Approved</span>
                    </div>
                    <pre className="text-[10px] text-white/70 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`### 3. Database Schema
\`\`\`prisma
model User {
  id    String @id
  theme String @default("system") // light | dark | system
}
\`\`\`

### 4. API Specification
- **Endpoint**: \`/api/settings/theme\`
- **Method**: \`POST\`
- **Payload**: \`{ theme: "light" | "dark" | "system" }\``}
                    </pre>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl text-[10px] text-white/60 text-left">
                    {[
                      { status: "Todo", title: "Theme DB Migration", desc: "Add Prisma user theme property and perform DB push" },
                      { status: "In Progress", title: "Theme Toggle Component", desc: "Create navbar switch button layout" },
                      { status: "Done", title: "Theme Context Provider", desc: "Integrate Next-themes provider wrapper" }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/[0.04] p-3 rounded-xl space-y-2">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-[#FF570A] border-b border-white/[0.04] pb-1 block">
                          {item.status}
                        </span>
                        <div className="space-y-1">
                          <h5 className="font-bold text-white leading-tight">{item.title}</h5>
                          <p className="text-[9px] text-white/50 leading-snug">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="bg-black/30 border border-white/[0.04] p-4 rounded-xl max-w-xl text-xs text-left">
                    <div className="flex justify-between items-center text-[9px] text-white/30 border-b border-white/[0.04] pb-2 mb-2">
                      <span>GitHub Action review analysis</span>
                      <span className="text-[#FF570A] font-bold uppercase">Passed</span>
                    </div>
                    <p className="text-[10px] text-white/80 leading-relaxed">
                      <span className="text-emerald-400 font-extrabold">PRD Alignment Check passed.</span> Diff files successfully implemented next-themes wrapper, layout settings, and endpoint routing.
                    </p>
                    <p className="text-[9px] text-white/40 mt-2">
                      Suggestions: Add debounce to storage layout setting triggers.
                    </p>
                  </div>
                )}

                {activeStep === 5 && (
                  <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-dashed border-white/10 rounded-xl gap-3 text-center max-w-md mx-auto">
                    <div className="size-10 rounded-full bg-[#FF570A]/10 border border-[#FF570A]/20 text-[#FF570A] flex items-center justify-center animate-pulse">
                      <RocketLaunch size={20} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-white">Release Approved</h5>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        All tasks check off and PR validations completed. Ready to ship.
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold bg-[#FF570A] text-white px-3 py-1 rounded-full tracking-wider font-mono">
                      DORA Feature Velocity: +12% /week
                    </span>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* CodeRabbit style Features Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/[0.04]">
        <div className="mb-12 text-left space-y-4">
          <h2 className="text-3xl font-extrabold text-white">Faster planning + better code.</h2>
          <p className="text-white/60 text-sm max-w-md">We do the heavy lifting and spot architectural details. You do the final 10%.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-[#0F2124]/10 border border-white/[0.04] rounded-2xl space-y-4 hover:border-[#FF570A]/40 transition">
            <div className="size-10 rounded-lg bg-[#FF570A]/10 border border-[#FF570A]/20 text-[#FF570A] flex items-center justify-center">
              <ChatTeardropText size={20} />
            </div>
            <h3 className="text-base font-bold text-white">Turn-by-turn chat analyst</h3>
            <p className="text-xs text-white/50 leading-relaxed font-medium">AI Analyst asks detailed technical questions to resolve ambiguities in scope, schemas and APIs.</p>
          </div>

          <div className="p-8 bg-[#0F2124]/10 border border-white/[0.04] rounded-2xl space-y-4 hover:border-[#FF570A]/40 transition">
            <div className="size-10 rounded-lg bg-[#FF570A]/10 border border-[#FF570A]/20 text-[#FF570A] flex items-center justify-center">
              <FileCode size={20} />
            </div>
            <h3 className="text-base font-bold text-white">Database &amp; API Specs</h3>
            <p className="text-xs text-white/50 leading-relaxed font-medium">Automatic suggestions for prisma models, database schemas, REST payload structures, and response validation.</p>
          </div>

          <div className="p-8 bg-[#0F2124]/10 border border-white/[0.04] rounded-2xl space-y-4 hover:border-[#FF570A]/40 transition">
            <div className="size-10 rounded-lg bg-[#FF570A]/10 border border-[#FF570A]/20 text-[#FF570A] flex items-center justify-center">
              <GitMerge size={20} />
            </div>
            <h3 className="text-base font-bold text-white">Context-aware PR Reviews</h3>
            <p className="text-xs text-white/50 leading-relaxed font-medium">AI agent runs code evaluations directly against your approved PRD spec to catch logic leaks before merging.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-black/35 border-t border-white/[0.04] py-24">
        <div className="mx-auto max-w-7xl px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#FF570A]">
              Flexible Plans
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2">Transparent, tier-based pricing</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            
            {/* Free Tier */}
            <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all">
              <div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-white/10 text-white/70 font-mono">
                  Free
                </span>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold">$0</span>
                </div>
                <p className="text-xs text-white/50 mt-2">For individuals starting out.</p>
                <ul className="text-xs space-y-3 mt-6 border-t border-white/[0.04] pt-6 text-white/70 font-mono text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>1 Workspace limit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>1 Project limit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>1 Feature per project</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>2 PR Reviews analyzed</span>
                  </li>
                </ul>
              </div>
              <Button 
                render={<Link href="/sign-in" />} 
                className="mt-8 w-full py-2.5 rounded-lg border border-white/10 bg-transparent text-white hover:bg-white/5 text-xs font-bold cursor-pointer"
              >
                Get Started Free
              </Button>
            </div>

            {/* Pro Starter Tier (Highlight) */}
            <div className="border border-[#FF570A]/30 bg-white/[0.02] rounded-2xl p-6 flex flex-col justify-between hover:border-[#FF570A]/40 transition-all relative overflow-hidden shadow-lg shadow-[#FF570A]/2">
              <div className="absolute top-0 right-0 h-16 w-16 translate-x-8 -translate-y-8 bg-[#FF570A]/10 rotate-45" />
              <div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#FF570A] text-white">
                  Pro Starter
                </span>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold">$3</span>
                  <span className="text-xs text-white/50">/month</span>
                </div>
                <p className="text-xs text-white/50 mt-2">Perfect for growing side projects.</p>
                <ul className="text-xs space-y-3 mt-6 border-t border-white/[0.04] pt-6 text-white/70 font-mono text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>1 Workspace limit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>3 Projects limit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>3 Features per project</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#FF570A]" />
                    <span>12 PR Reviews analyzed</span>
                  </li>
                </ul>
              </div>
              <Button 
                render={<Link href="/sign-in" />} 
                className="mt-8 w-full py-2.5 rounded-lg bg-[#FF570A] hover:bg-[#E04B00] text-white text-xs font-bold cursor-pointer border-none"
              >
                Upgrade in Settings
              </Button>
            </div>

            {/* Unlimited Tier */}
            <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-10 -translate-y-10 bg-amber-500/10 rotate-45" />
              <div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border border-amber-500/30 text-amber-500 bg-amber-500/5">
                  Unlimited
                </span>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold">$9</span>
                  <span className="text-xs text-white/50">/month</span>
                </div>
                <p className="text-xs text-white/50 mt-2">For heavy use and team scales.</p>
                <ul className="text-xs space-y-3 mt-6 border-t border-white/[0.04] pt-6 text-white/70 font-mono text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500" />
                    <span>Unlimited Workspaces</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500" />
                    <span>Unlimited Projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500" />
                    <span>Unlimited Features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500" />
                    <span>Unlimited PR Reviews</span>
                  </li>
                </ul>
              </div>
              <Button 
                render={<Link href="/sign-in" />} 
                className="mt-8 w-full py-2.5 rounded-lg border border-amber-500/20 bg-transparent text-amber-500 hover:bg-amber-500/5 text-xs font-bold cursor-pointer"
              >
                Upgrade in Settings
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Footer (Same visual look as reference page) */}
      <footer className="border-t border-white/[0.04] py-16 bg-black text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#FF570A]/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Start shipping with AI today</h2>
          <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
            Integrate ShipFlow AI into your GitHub organization and speed up your delivery cycle.
          </p>
          <div className="pt-2">
            <Button 
              render={<Link href="/sign-in" />} 
              size="lg" 
              className="inline-flex items-center gap-2 bg-[#FF570A] hover:bg-[#E04B00] text-white rounded-lg font-bold text-sm px-8 py-3.5 shadow-xl shadow-[#FF570A]/20"
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} weight="bold" />
            </Button>
          </div>
          <p className="text-[10px] text-white/30 pt-8">&copy; {new Date().getFullYear()} ShipFlow AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

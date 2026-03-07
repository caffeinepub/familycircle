import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const SAMPLE_POSTS = [
  {
    id: 1,
    username: "sarah_miller",
    initials: "SM",
    caption: "Sunday brunch with the whole crew 🥞",
    time: "2h ago",
    bg: "from-amber-100 to-orange-100",
    emoji: "🥞",
  },
  {
    id: 2,
    username: "dad_photos",
    initials: "DP",
    caption: "Emma's first bike ride without training wheels!",
    time: "4h ago",
    bg: "from-rose-100 to-pink-100",
    emoji: "🚲",
  },
  {
    id: 3,
    username: "grandma_rose",
    initials: "GR",
    caption: "Made grandpa's famous apple pie recipe ❤️",
    time: "1d ago",
    bg: "from-yellow-100 to-amber-100",
    emoji: "🥧",
  },
];

const features = [
  {
    num: "01",
    title: "Share with loved ones",
    desc: "Posts are only visible to confirmed friends — your memories stay private.",
  },
  {
    num: "02",
    title: "Private & secure",
    desc: "No algorithms, no ads, no strangers. Just your circle.",
  },
  {
    num: "03",
    title: "Stay in the loop",
    desc: "Get notified when friends post or send you a friend request.",
  },
  {
    num: "04",
    title: "People-first social",
    desc: "Find friends by username and build your private circle.",
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useInternetIdentity();

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/30"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-6"
              >
                <img
                  src="/assets/generated/mycircle-logo-transparent.dim_120x120.png"
                  alt="MyCircle"
                  className="h-10 w-10"
                />
                <span className="font-display font-bold text-2xl text-foreground">
                  MyCircle
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="font-display font-bold text-4xl sm:text-5xl text-foreground leading-tight mb-4"
              >
                Your private space for{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">
                    shared memories
                  </span>
                  <svg
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-0 w-full"
                    viewBox="0 0 240 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M4 6.5C40 2.5 80 8.5 120 5C160 1.5 200 7 236 4"
                      stroke="oklch(0.58 0.16 42 / 0.45)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-muted-foreground text-lg mb-8 leading-relaxed"
              >
                Share photos and videos with the people who matter most. No ads,
                no algorithms — just your circle.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button
                  size="lg"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="text-base font-semibold px-8 h-12 rounded-full"
                >
                  {isLoggingIn ? "Signing in..." : "Get started"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ to: "/login" })}
                  className="text-base px-8 h-12 rounded-full"
                >
                  Sign in
                </Button>
              </motion.div>
            </div>

            {/* Right: Sample posts preview */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="space-y-3">
                {SAMPLE_POSTS.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
                    className="bg-card rounded-2xl p-4 shadow-card border border-border/50 flex items-center gap-4"
                  >
                    <div
                      className={`h-12 w-12 rounded-full bg-gradient-to-br ${post.bg} flex items-center justify-center text-xl flex-shrink-0`}
                    >
                      {post.emoji}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm text-foreground">
                        @{post.username}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {post.caption}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {post.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hero image */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="rounded-3xl overflow-hidden shadow-card-hover border border-border/30"
        >
          <img
            src="/assets/uploads/IMG_0519-1.jpeg"
            alt="Friends jumping on the beach"
            className="w-full object-cover h-64 sm:h-80"
          />
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display font-bold text-2xl sm:text-3xl text-center text-foreground mb-10"
        >
          Built for people who actually care
        </motion.h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-6 shadow-card border border-border/50 card-grain group hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <span
                  className="font-display font-black text-5xl leading-none select-none feature-num"
                  aria-hidden="true"
                >
                  {feat.num}
                </span>
                <div className="pt-1.5">
                  <h3 className="font-display font-semibold text-base text-foreground mb-1.5">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

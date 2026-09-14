import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, ScanText, Layers, Waves, Shuffle, Server } from 'lucide-react'

const items = [
  {
    icon: ShieldCheck,
    title: 'Never a made-up answer',
    body: "If it's not in your documents, it says so instead of guessing. Every answer points to the exact line it came from, so you can check it yourself in one click.",
  },
  {
    icon: ScanText,
    title: 'Skip the skimming',
    body: 'Drop in a long report, contract, or set of notes and just ask. Get the answer instead of hunting through pages for it.',
  },
  {
    icon: Layers,
    title: 'Works with what you already have',
    body: 'PDF, Word, Excel, CSV, JSON, plain text, code, even a photo of a page. No converting files first.',
  },
  {
    icon: Waves,
    title: 'Answers as you read them',
    body: "No spinner, no waiting for a wall of text to appear at once — the answer streams in as it's generated.",
  },
  {
    icon: Shuffle,
    title: "Doesn't leave you hanging",
    body: 'If one AI model is slow or unavailable, it quietly falls back to another so you still get an answer instead of an error.',
  },
  {
    icon: Server,
    title: 'Built to actually hold up',
    body: "Not a fragile weekend demo — it's monitored, rate-limited, and hardened to keep working under real use.",
  },
]

/* Same fade variants as the hero; whileInView so below-the-fold cards
   animate as they arrive (MotionConfig reducedMotion="user" collapses
   the transform when the OS asks for it). */
const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
}

export function Features() {
  return (
    <section
      id="features"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-2xl text-center">
        <motion.h2
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          Everything it does
          <br />
          <span className="gradient-text">so you don&apos;t have to.</span>
        </motion.h2>
        <motion.p
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          custom={1}
          className="mx-auto mt-4 max-w-xl text-base text-muted"
        >
          Upload a folder of files and ask in plain language — here&apos;s what
          that actually gives you.
        </motion.p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            custom={i}
            className="h-full"
          >
            <Card className="group h-full transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10">
              <CardHeader>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 transition-colors group-hover:bg-brand-500/25">
                  <Icon className="h-5 w-5 text-brand-400" />
                </span>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-sm leading-relaxed text-muted">{body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

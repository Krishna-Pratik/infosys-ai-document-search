import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Sparkles, FileSearch, Zap, ShieldCheck } from 'lucide-react'

const features = [
  { icon: FileSearch, label: 'Semantic retrieval' },
  { icon: Zap, label: 'Multi-model failover' },
  { icon: ShieldCheck, label: 'Grounded, cited answers' },
]

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
}

export function Hero() {
  return (
    <section className="relative mx-auto max-w-4xl px-5 pt-16 pb-10 text-center sm:pt-24">
      <motion.div variants={fade} initial="hidden" animate="show" custom={0}>
        <Badge className="mx-auto">
          <Sparkles className="h-3.5 w-3.5" />
          RAG · FastAPI · LangChain · FAISS · Gemini
        </Badge>
      </motion.div>

      <motion.h1
        variants={fade}
        initial="hidden"
        animate="show"
        custom={1}
        className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl"
      >
        Chat with your documents,
        <br />
        <span className="gradient-text">backed by real sources.</span>
      </motion.h1>

      <motion.p
        variants={fade}
        initial="hidden"
        animate="show"
        custom={2}
        className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg"
      >
        Upload PDFs, Word docs, spreadsheets, images — anything. NeuralDocs
        extracts the content, retrieves the most relevant passages, and returns
        grounded answers with citations — never hallucinated.
      </motion.p>

      <motion.div
        variants={fade}
        initial="hidden"
        animate="show"
        custom={3}
        className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
      >
        {features.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3.5 py-1.5 text-sm text-muted"
          >
            <Icon className="h-4 w-4 text-brand-400" />
            {label}
          </span>
        ))}
      </motion.div>
    </section>
  )
}

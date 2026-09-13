export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-5 pb-8 pt-12 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-2 border-t border-border/70 pt-6 text-xs text-faint sm:flex-row sm:items-center">
        <p>NeuralDocs — retrieval over your documents, citations over guesses.</p>
        <p className="font-mono">FastAPI · FAISS · React</p>
      </div>
    </footer>
  )
}

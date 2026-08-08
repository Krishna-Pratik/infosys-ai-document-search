/** Fixed, full-viewport ambient background: aurora blobs + grid texture. */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="animate-aurora absolute -top-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-brand-500/25 blur-[120px]" />
      <div
        className="animate-aurora absolute -top-20 right-0 h-[30rem] w-[30rem] rounded-full bg-cyan/20 blur-[120px]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="animate-aurora absolute bottom-0 left-1/3 h-[34rem] w-[34rem] rounded-full bg-violet/20 blur-[130px]"
        style={{ animationDelay: '-12s' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
    </div>
  )
}

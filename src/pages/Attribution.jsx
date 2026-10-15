import { useState } from 'react'

/**
 * Small always-visible attribution line for any CC-BY assets, as required by
 * the project's asset licensing rules. See CREDITS.md for full attribution.
 */
export default function Attribution() {
  const [open, setOpen] = useState(false)
  return (
    <div className="pointer-events-none absolute bottom-1 left-0 right-0 z-50 flex justify-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto rounded-full bg-black/40 px-3 py-1 text-[10px] text-pink-200/50 backdrop-blur transition hover:text-pink-200/80"
      >
        Credits & licenses
      </button>
      {open && (
        <div className="pointer-events-auto absolute bottom-7 max-w-md rounded-lg border border-pink-500/20 bg-black/80 p-3 text-center text-[11px] leading-relaxed text-pink-200/70 backdrop-blur">
          Game art in Heart Wars is generated procedurally (no third-party image
          files). Emoji glyphs are rendered by your system font. Any CC-BY assets
          added later must be credited here and in <b>CREDITS.md</b>.
        </div>
      )}
    </div>
  )
}

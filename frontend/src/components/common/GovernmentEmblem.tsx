/**
 * Stylized SVG Representation of the State Emblem of India (Lion Capital of Ashoka)
 * with "सत्यमेव जयते" (Truth Alone Triumphs) motto in Devanagari.
 */
export default function GovernmentEmblem({ className = "h-14 w-auto" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center select-none text-amber-800 ${className}`}>
      <svg
        viewBox="0 0 100 125"
        fill="currentColor"
        className="h-10 w-auto text-amber-900 drop-shadow-xs"
        aria-label="Emblem of India"
      >
        {/* Stylized Lion Capital Profile */}
        <g stroke="none">
          {/* Top Crown / Lions crest */}
          <path d="M50 8 C47 8 45 10 44 12 C42 10 39 9 37 11 C35 12 34 15 35 18 C33 19 31 22 32 25 C34 29 38 31 42 32 C41 35 41 39 42 42 C40 43 38 45 37 48 C36 51 38 55 42 56 L42 60 L32 60 C29 60 27 62 27 65 C27 67 29 69 32 69 L68 69 C71 69 73 67 73 65 C73 62 71 60 68 60 L58 60 L58 56 C62 55 64 51 63 48 C62 45 60 43 58 42 C59 39 59 35 58 32 C62 31 66 29 68 25 C69 22 67 19 65 18 C66 15 65 12 63 11 C61 9 58 10 56 12 C55 10 53 8 50 8 Z" />
          {/* Central Ashoka Chakra */}
          <circle cx="50" cy="79" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="50" cy="79" r="1.5" />
          {/* Chakra spokes representation */}
          <path d="M50 71 L50 87 M42 79 L58 79 M44 73 L56 85 M44 85 L56 73" stroke="currentColor" strokeWidth="1" />
          {/* Guardian Bull & Horse silhouettes on abacus */}
          <path d="M28 77 C26 77 24 79 24 81 C25 83 28 83 30 82 C31 80 30 78 28 77 Z" />
          <path d="M72 77 C74 77 76 79 76 81 C75 83 72 83 70 82 C69 80 70 78 72 77 Z" />
          {/* Base pediment */}
          <rect x="20" y="88" width="60" height="4" rx="1.5" />
          <rect x="25" y="93" width="50" height="2.5" rx="1" />
        </g>
      </svg>
      <span className="text-[9px] font-bold tracking-widest text-amber-950 font-serif uppercase -mt-0.5">
        सत्यमेव जयते
      </span>
    </div>
  );
}
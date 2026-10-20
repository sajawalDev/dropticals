/** A face that turns, with frames that follow, inside a phone. */
export function PhoneMock() {
  return (
    <svg viewBox="0 0 320 660" aria-hidden="true">
      <defs>
        <radialGradient id="pmGlow" cx=".5" cy=".42" r=".6">
          <stop offset="0" stopColor="#2a2a2a" />
          <stop offset="1" stopColor="#0d0d0d" />
        </radialGradient>
      </defs>
      <rect width="320" height="660" fill="url(#pmGlow)" />
      <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="head-turn">
          <path d="M160 132c-62 0-98 50-98 122 0 88 44 158 98 158s98-70 98-158c0-72-36-122-98-122z" opacity=".9" />
          <path d="M64 238c-14-4-20 8-17 24 3 18 12 30 22 30M256 238c14-4 20 8 17 24-3 18-12 30-22 30" opacity=".75" />
          <path d="M70 196c18-46 56-62 90-62s72 16 90 62c-26-22-56-30-90-30s-64 8-90 30z" fill="#fff" fillOpacity=".08" />
          <path d="M118 450c8 26 22 46 42 46s34-20 42-46" opacity=".35" />
          <g className="feat-turn">
            <path d="M106 258c8-8 18-11 28-8M186 250c10-3 20 0 28 8" opacity=".75" />
            <ellipse cx="122" cy="272" rx="12" ry="6.5" />
            <ellipse cx="198" cy="272" rx="12" ry="6.5" />
            <circle cx="122" cy="272" r="3.4" fill="#fff" />
            <circle cx="198" cy="272" r="3.4" fill="#fff" />
            <path d="M160 282c-4 22-10 38-16 46 8 6 24 6 32 0" opacity=".8" />
            <path d="M138 368c14 8 30 8 44 0" opacity=".85" />
          </g>
        </g>
        <g className="glass-turn" strokeWidth="5">
          <rect x="84" y="244" width="70" height="54" rx="20" />
          <rect x="166" y="244" width="70" height="54" rx="20" />
          <path d="M154 262q6-6 12 0" strokeWidth="4" />
          <path d="M84 256h-14M236 256h14" strokeWidth="5" />
        </g>
        <path className="temple-l" d="M70 256 48 262" strokeWidth="4.5" />
        <path className="temple-r" d="M250 256 272 262" strokeWidth="4.5" />
      </g>
      <g transform="translate(0 548)">
        <rect x="18" y="0" width="56" height="40" rx="10" fill="#fff" opacity=".45" />
        <rect x="82" y="0" width="56" height="40" rx="10" fill="#fff" />
        <rect x="146" y="0" width="56" height="40" rx="10" fill="#fff" opacity=".45" />
        <rect x="210" y="0" width="56" height="40" rx="10" fill="#fff" opacity=".45" />
        <g fill="none" stroke="#000" strokeWidth="2.4">
          <rect x="91" y="13" width="16" height="12" rx="4" />
          <rect x="113" y="13" width="16" height="12" rx="4" />
          <path d="M107 18q3-3 6 0" />
        </g>
        <circle cx="160" cy="76" r="22" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="160" cy="76" r="16" fill="#fff" />
      </g>
    </svg>
  );
}

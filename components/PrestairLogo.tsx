export const PRESTAIR_ADDRESS = "B 127-128, B 91-2, B 124, B 116, Phase 2, Noida 201305";

const PRESTAIR_LOGO_MASK = {
  WebkitMaskImage: 'url("/logos/logo2-1.png")',
  maskImage: 'url("/logos/logo2-1.png")',
  WebkitMaskPosition: "left center",
  maskPosition: "left center",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
} as const;

type PrestairLogoProps = {
  className?: string;
};

export default function PrestairLogo({
  className = "h-14 sm:h-16",
}: PrestairLogoProps) {
  return (
    <div
      role="img"
      aria-label="Prestair Systems LLP — Since 1982"
      className={`relative aspect-[264/85] flex-shrink-0 ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#233f88]"
        style={PRESTAIR_LOGO_MASK}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#9a9b9e]"
        style={{ ...PRESTAIR_LOGO_MASK, clipPath: "inset(36% 43% 25% 0)" }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#9a9b9e]"
        style={{ ...PRESTAIR_LOGO_MASK, clipPath: "inset(45% 33% 30% 56%)" }}
      />
    </div>
  );
}

export function PrestairBrandHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden px-4 py-3 text-white ${className}`} style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #2563eb 100%)" }}>
      <div className="relative flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-5 -inset-y-2 rounded-full bg-[radial-gradient(ellipse_at_left,rgba(147,197,253,0.3),rgba(59,130,246,0.1)_52%,transparent_74%)] blur-md"
          />
          <PrestairLogo className="relative h-12 sm:h-14" />
        </div>
        <div className="max-w-xl text-center sm:text-right">
          <p className="text-xs font-semibold leading-relaxed text-blue-100">{PRESTAIR_ADDRESS}</p>
          <p className="mt-0.5 text-[11px] text-blue-300">GST: 09AATFP8342B1ZX</p>
        </div>
      </div>
    </div>
  );
}

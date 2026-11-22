import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white px-4 py-3 text-center text-xs text-slate-500 sm:text-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
        <span>Hecho en</span>
        <Image
          alt="Ecuador"
          className="h-auto w-7 rounded-[2px] shadow-sm"
          height={20}
          src="/brand/ecuador-flag.svg"
          title="Ecuador"
          unoptimized
          width={30}
        />
        <span>usando</span>
        <a
          className="font-medium text-[#6d4aff] underline decoration-[#cfc4ff] underline-offset-2 hover:text-[#5b3fe0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d4aff]"
          href="https://www.flaticon.com/uicons"
          rel="noreferrer"
          target="_blank"
        >
          Uicons by Flaticon
        </a>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white px-4 py-4 text-center text-xs text-slate-500 sm:text-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
        <span>Hecho en</span>
        <svg
          aria-label="Ecuador"
          className="h-3.5 w-5 rounded-[2px] shadow-sm"
          role="img"
          viewBox="0 0 30 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="#FFDD00" height="10" width="30" />
          <rect fill="#034EA2" height="5" width="30" y="10" />
          <rect fill="#ED1C24" height="5" width="30" y="15" />
        </svg>
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

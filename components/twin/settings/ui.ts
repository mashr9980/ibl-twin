// The classes twin.memorare.ai uses in its settings dialog, with this app's
// tokens in place of twin's (`ibl`/`ibl-indigo` → `--brand`/`--brand-violet`).

export const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 h-9 px-4 text-sm font-normal rounded-[8px] border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground";

export const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 py-2 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] border-0 text-white shadow-none transition-all hover:brightness-[0.96] active:brightness-[0.92] h-9 px-4 text-sm font-normal rounded-[8px]";

export const FIELD =
  "flex w-full border px-3 py-2 ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 h-10 border-input bg-background shadow-sm rounded-[8px] outline-none focus-visible:border-[var(--brand)] focus-visible:ring-0 focus-visible:ring-offset-0 dark:focus-visible:border-[var(--brand-on-dark)] text-base leading-snug text-sidebar-foreground dark:text-foreground placeholder:text-[11px] placeholder:leading-snug sm:placeholder:text-[13px] sm:text-[13px]";

export const LABEL =
  "flex items-center gap-2 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 text-sm font-medium text-foreground";

export const HINT = "text-xs text-muted-foreground";
export const VALUE = "text-sm text-muted-foreground";

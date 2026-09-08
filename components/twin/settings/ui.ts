// The classes twin.memorare.ai uses in its settings dialog, with this app's
// tokens in place of twin's. Colours go through `var(--…)` on purpose: the
// SDK's stylesheet defines its own `.bg-card`, `.text-foreground` and friends
// against variables this app never sets, and they beat Tailwind's.

export const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 h-9 px-4 text-sm font-normal rounded-[8px] border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]";

const GRADIENT =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 py-2 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] border-0 text-white shadow-none transition-all hover:brightness-[0.96] active:brightness-[0.92] rounded-[8px]";

/** twin's primary button: 36px in rows, 40px under an empty state. */
export const PRIMARY_BTN = `${GRADIENT} h-9 px-4 text-sm font-normal`;
export const PRIMARY_BTN_LG = `${GRADIENT} h-10 px-6 text-sm font-medium`;
export const PRIMARY_BTN_PILL = `${GRADIENT} h-9 shrink-0 px-5 text-sm font-medium`;

/** The dark, high-contrast button twin uses for "copy this prompt". */
export const CONTRAST_BTN =
  "inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 py-2 h-9 gap-1.5 bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)] rounded-[8px] hover:opacity-90";

export const FIELD =
  "flex w-full border px-3 py-2 ring-offset-background placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50 h-10 border-[var(--input)] bg-[var(--background)] shadow-sm rounded-[8px] outline-none focus-visible:border-[var(--brand)] focus-visible:ring-0 focus-visible:ring-offset-0 dark:focus-visible:border-[var(--brand-on-dark)] text-base leading-snug text-[var(--sidebar-foreground)] dark:text-[var(--foreground)] placeholder:text-[11px] placeholder:leading-snug sm:placeholder:text-[13px] sm:text-[13px]";

export const TEXTAREA = FIELD.replace("h-10", "min-h-[120px] resize-none");

/** The Account panel's label. */
export const LABEL =
  "flex items-center gap-2 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 text-sm font-medium text-[var(--foreground)]";

/** The label twin uses outside the Account panel. */
export const FIELD_LABEL =
  "flex items-center gap-2 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 text-sm font-medium text-[var(--sidebar-foreground)] dark:text-[var(--foreground)]";

export const HINT = "text-xs text-[var(--muted-foreground)]";
export const VALUE = "text-sm text-[var(--muted-foreground)]";
export const CARD = "border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 rounded-[8px]";
export const MUTED_CARD = "border border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_30%,transparent)] p-4 rounded-[8px]";
export const CHIP =
  "flex min-h-[40px] shrink-0 snap-start items-center rounded-[8px] px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:min-h-0";
export const CHIP_ON = "bg-[var(--card)] text-[var(--foreground)] shadow-sm";
export const CHIP_OFF =
  "text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--muted)_60%,transparent)] hover:text-[var(--foreground)]";
/** A row of chips that scrolls sideways without showing a scrollbar. */
export const CHIP_ROW =
  "flex gap-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Sidebar icons traced from twin's deployed markup. These are its own
 * drawings, not lucide equivalents; Voice and the chevron really are lucide.
 */

type P = { className?: string };

export function TwinIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15 12L12 12M12 12L9 12M12 12L12 9M12 12L12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AvatarIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M10.0042 17.7195V17.7195C9.63874 18.7034 10.3665 19.75 11.416 19.75H18.0397C18.5872 19.75 18.8609 19.75 19.0645 19.7162C20.4518 19.4855 21.376 18.1564 21.1091 16.7756C21.07 16.573 20.9747 16.3164 20.784 15.8031V15.8031C20.6253 15.3759 20.546 15.1623 20.4537 14.9759C19.8451 13.7459 18.6484 12.9139 17.2836 12.7716C17.0767 12.75 16.8488 12.75 16.3931 12.75H14.6075C14.3945 12.75 14.288 12.75 14.1821 12.7556C13.9157 12.7697 13.6513 12.8105 13.393 12.8773C13.2904 12.9038 13.1889 12.9358 12.9857 13V13M8.33008 8.25C7.22551 8.25 6.33008 7.35457 6.33008 6.25C6.33008 5.14543 7.22551 4.25 8.33008 4.25C9.43465 4.25 10.3301 5.14543 10.3301 6.25C10.3301 7.35457 9.43465 8.25 8.33008 8.25ZM15.8301 10.25C14.7255 10.25 13.8301 9.35457 13.8301 8.25C13.8301 7.14543 14.7255 6.25 15.8301 6.25C16.9346 6.25 17.8301 7.14543 17.8301 8.25C17.8301 9.35457 16.9346 10.25 15.8301 10.25ZM5.96032 17.75H10.5397C11.0872 17.75 11.3609 17.75 11.5645 17.7162C12.9518 17.4855 13.876 16.1564 13.6091 14.7756C13.57 14.573 13.4747 14.3164 13.284 13.8031V13.8031C13.1253 13.3759 13.046 13.1623 12.9537 12.9759C12.3451 11.7459 11.1484 10.9139 9.78358 10.7716C9.5767 10.75 9.34883 10.75 8.89307 10.75H7.60693C7.15117 10.75 6.9233 10.75 6.71642 10.7716C5.35155 10.9139 4.15492 11.7459 3.54627 12.9759C3.45401 13.1623 3.37467 13.3759 3.21598 13.8031V13.8031C3.02535 14.3164 2.93003 14.573 2.89087 14.7756C2.62401 16.1564 3.54819 17.4855 4.9355 17.7162C5.13908 17.75 5.41283 17.75 5.96032 17.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function VideoClipIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <mask id="video-clip-nav-icon-mask" fill="black">
        <path d="M15 8.75C15 9.16421 14.6642 9.5 14.25 9.5C13.8358 9.5 13.5 9.16421 13.5 8.75C13.5 8.33579 13.8358 8 14.25 8C14.6642 8 15 8.33579 15 8.75Z" />
      </mask>
      <path d="M15 8.75C15 9.16421 14.6642 9.5 14.25 9.5C13.8358 9.5 13.5 9.16421 13.5 8.75C13.5 8.33579 13.8358 8 14.25 8C14.6642 8 15 8.33579 15 8.75Z" fill="currentColor" />
      <path d="M13.5 8.75C13.5 8.33579 13.8358 8 14.25 8V11C15.4926 11 16.5 9.99264 16.5 8.75H13.5ZM14.25 8C14.6642 8 15 8.33579 15 8.75H12C12 9.99264 13.0074 11 14.25 11V8ZM15 8.75C15 9.16421 14.6642 9.5 14.25 9.5V6.5C13.0074 6.5 12 7.50736 12 8.75H15ZM14.25 9.5C13.8358 9.5 13.5 9.16421 13.5 8.75H16.5C16.5 7.50736 15.4926 6.5 14.25 6.5V9.5Z" fill="currentColor" mask="url(#video-clip-nav-icon-mask)" />
      <path d="M11.5 9.5C11.9142 9.5 12.25 9.16421 12.25 8.75C12.25 8.33579 11.9142 8 11.5 8L11.5 9.5ZM6.5 8C6.08579 8 5.75 8.33579 5.75 8.75C5.75 9.16421 6.08579 9.5 6.5 9.5L6.5 8ZM11.5 8L6.5 8L6.5 9.5L11.5 9.5L11.5 8Z" fill="currentColor" />
      <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.352 4.28094 21.7133 5.37486 21.8731 7M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2.64799 19.7191 2.28672 18.6251 2.12687 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MyTwinIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M4.16841 16.1211C5.2822 13.615 7.76737 12 10.5098 12H13.4902C16.2326 12 18.7178 13.615 19.8316 16.1211V16.1211C20.8514 18.4156 19.1718 21 16.6609 21H7.33909C4.82819 21 3.14864 18.4156 4.16841 16.1211V16.1211Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 6C9 4.34315 10.3431 3 12 3C13.6569 3 15 4.34315 15 6C15 7.65685 13.6569 9 12 9C10.3431 9 9 7.65685 9 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function MyAvatarIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M17 2.5L17 21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 2.5L7 21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.5 6.25C2.08579 6.25 1.75 6.58579 1.75 7C1.75 7.41421 2.08579 7.75 2.5 7.75L2.5 6.25ZM7 7.75C7.41421 7.75 7.75 7.41421 7.75 7C7.75 6.58579 7.41421 6.25 7 6.25L7 7.75ZM17 6.25C16.5858 6.25 16.25 6.58579 16.25 7C16.25 7.41421 16.5858 7.75 17 7.75V6.25ZM2.5 7.75L7 7.75L7 6.25L2.5 6.25L2.5 7.75ZM17 7.75L22 7.75V6.25L17 6.25V7.75Z" fill="currentColor" />
      <path d="M21.5 17.75C21.9142 17.75 22.25 17.4142 22.25 17C22.25 16.5858 21.9142 16.25 21.5 16.25V17.75ZM17 16.25C16.5858 16.25 16.25 16.5858 16.25 17C16.25 17.4142 16.5858 17.75 17 17.75V16.25ZM7 17.75C7.41421 17.75 7.75 17.4142 7.75 17C7.75 16.5858 7.41421 16.25 7 16.25L7 17.75ZM17 17.75L21.5 17.75V16.25L17 16.25V17.75ZM2 17.75L7 17.75L7 16.25L2 16.25L2 17.75Z" fill="currentColor" />
      <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.352 4.28094 21.7133 5.37486 21.8731 7M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2.64799 19.7191 2.28672 18.6251 2.12687 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MyVideoClipIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M19.5617 7C19.7904 5.69523 18.7863 4.5 17.4617 4.5H6.53788C5.21323 4.5 4.20922 5.69523 4.43784 7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17.4999 4.5C17.5283 4.24092 17.5425 4.11135 17.5427 4.00435C17.545 2.98072 16.7739 2.12064 15.7561 2.01142C15.6497 2 15.5194 2 15.2588 2H8.74099C8.48035 2 8.35002 2 8.24362 2.01142C7.22584 2.12064 6.45481 2.98072 6.45704 4.00434C6.45727 4.11135 6.47146 4.2409 6.49983 4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21.1935 16.793C20.8437 19.2739 20.6689 20.5143 19.7717 21.2572C18.8745 22 17.5512 22 14.9046 22H9.09536C6.44881 22 5.12553 22 4.22834 21.2572C3.33115 20.5143 3.15626 19.2739 2.80648 16.793L2.38351 13.793C1.93748 10.6294 1.71447 9.04765 2.66232 8.02383C3.61017 7 5.29758 7 8.67239 7H15.3276C18.7024 7 20.3898 7 21.3377 8.02383C22.0865 8.83268 22.1045 9.98979 21.8592 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.5812 13.6159C15.1396 13.9621 15.1396 14.8582 14.5812 15.2044L11.2096 17.2945C10.6669 17.6309 10 17.1931 10 16.5003L10 12.32C10 11.6273 10.6669 11.1894 11.2096 11.5258L14.5812 13.6159Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EducationalIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M3.77 15.56L7.23 19.02C9.66 21.45 10.49 21.41 12.89 19.02L18.46 13.45C20.4 11.51 20.89 10.22 18.46 7.78996L15 4.32996C12.41 1.73996 11.28 2.38996 9.34 4.32996L3.77 9.89996C1.38 12.3 1.18 12.97 3.77 15.56Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.2 16.79L18.54 17.88C17.61 19.43 18.33 20.7 20.14 20.7C21.95 20.7 22.67 19.43 21.74 17.88L21.08 16.79C20.56 15.93 19.71 15.93 19.2 16.79Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12.2401C7.56 10.7301 13.42 10.6801 19 12.1101L19.5 12.2401" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HistoricalIcon({ className }: P) {
  return (
    <svg viewBox="720 750 660 600" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path fillRule="evenodd" fill="currentColor" d="M 1049.921875 777.070312 C 1042.058594 777.089844 1034.679688 780.871094 1030.078125 787.25 L 938.214844 914.300781 L 782.386719 847.589844 C 774.515625 844.21875 765.457031 845.191406 758.476562 850.148438 C 751.496094 855.109375 747.601562 863.351562 748.191406 871.890625 L 769.730469 1181.390625 C 770.628906 1194.269531 781.335938 1204.261719 794.25 1204.265625 L 1305.75 1204.265625 C 1318.660156 1204.261719 1329.371094 1194.269531 1330.269531 1181.390625 L 1351.808594 871.890625 C 1352.398438 863.351562 1348.5 855.109375 1341.519531 850.148438 C 1334.539062 845.191406 1325.480469 844.21875 1317.609375 847.589844 L 1161.789062 914.300781 L 1069.921875 787.25 C 1065.28125 780.828125 1057.839844 777.039062 1049.921875 777.070312 Z M 1050 843.609375 L 1133.460938 959.039062 C 1140.191406 968.359375 1152.488281 971.761719 1163.058594 967.238281 L 1299.960938 908.628906 L 1282.808594 1155.097656 L 817.179688 1155.097656 L 800.035156 908.621094 L 936.945312 967.238281 C 947.511719 971.761719 959.804688 968.359375 966.539062 959.039062 Z M 1050 843.609375" />
      <path fill="none" stroke="currentColor" strokeWidth="688.341" strokeLinecap="round" strokeLinejoin="miter" strokeMiterlimit="4" d="M 8077.695312 8114.84375 L 12922.304688 8114.84375" transform="matrix(0.1, 0, 0, -0.1, 0, 2100)" />
    </svg>
  );
}

/** The rail's collapse control. */
export function CollapseIcon({ className }: P) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M16.5 4A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9A1.5 1.5 0 0 1 3.5 4zM7 15h9.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5H7zM3.5 5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H6V5z" />
    </svg>
  );
}

/** Twin's brand-gradient YouTube mark on the My Videos import button. */
export function YoutubeGradientIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="twin-youtube-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38A1E5" />
          <stop offset="1" stopColor="#7284FF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#twin-youtube-gradient)"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  );
}

/**
 * Twin's empty-state artwork: a brand-tinted inbox at 132px, not an icon.
 * Traced from its deployed markup, fill opacities included.
 */
export function EmptyInboxArt({ className }: P) {
  return (
    <svg width="132" height="132" viewBox="0 0 96 96" fill="none" aria-hidden="true" className={className}>
      <circle cx="48" cy="50" r="30" fill="#38A1E5" fillOpacity="0.08" />
      <path d="M22 46h52v22a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V46Z" fill="#38A1E5" fillOpacity="0.16" />
      <path d="M30 28h36l8 18H22l8-18Z" fill="#38A1E5" fillOpacity="0.55" />
      <path d="M22 46h18a8 8 0 0 0 16 0h18" stroke="#38A1E5" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 60h14M48 66h10" stroke="#38A1E5" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="22" cy="30" r="1.8" fill="#38A1E5" fillOpacity="0.6" />
      <circle cx="74" cy="34" r="1.8" fill="#38A1E5" fillOpacity="0.6" />
      <circle cx="65" cy="22" r="1.4" fill="#38A1E5" fillOpacity="0.45" />
    </svg>
  );
}

/** X's wordmark. lucide dropped its Twitter glyph, so twin inlines this. */
export function XIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

/** LinkedIn's mark, matching twin's tile. */
export function LinkedInIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13M7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0" />
    </svg>
  );
}

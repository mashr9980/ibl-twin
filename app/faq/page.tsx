import Link from "next/link";

export const metadata = { title: "help & faq" };

/**
 * Questions mirror twin.memorare.ai's eight groups. Answers are written for
 * *this* build — HeyGen-backed on an ibl.ai tenant — rather than copied, so
 * nothing here claims a capability the app doesn't have.
 *
 * <details> keeps every answer in the server-rendered HTML: collapsed for
 * reading, but present for search and assistive tech without needing JS.
 */
const GROUPS: { group: string; qa: [string, string][] }[] = [
  {
    group: "Getting Started",
    qa: [
      ["What is Memorare Twin?", "An AI video studio. Upload a photo to create a digital twin of yourself, or pick from the avatar catalogue, then type a script and generate a video of that avatar speaking it."],
      ["Who is Memorare Twin for?", "Anyone who needs talking-head video without a camera: educators recording lessons, teams sending updates, and creators producing explainers."],
      ["What can I create with Memorare Twin?", "Avatar videos from a script, a personal twin from one photo, and short video clips generated from a reference image and a motion prompt."],
    ],
  },
  {
    group: "AI Avatars",
    qa: [
      ["What is an AI avatar?", "A digital presenter that lip-syncs to speech generated from your script. It can be a catalogue character or a twin trained from your own photo."],
      ["Can I create an avatar of myself?", "Yes. Create Twin accepts a photo (JPG, PNG, GIF or WEBP up to 10MB) or a video (MP4, MOV or WEBM up to 100MB), from which a clear frame is used for training. One twin per account."],
      ["Can I use pre-built avatars?", "Yes. The Gallery lists every avatar available to your tenant, filterable by category and searchable by name."],
      ["What type of photo works best for a custom avatar?", "A sharp, well-lit, front-facing photo where your whole face is visible and unobstructed. Avoid heavy shadows, sunglasses, motion blur, and group shots."],
    ],
  },
  {
    group: "Scripts and Voices",
    qa: [
      ["Can I write my own script?", "Yes. The generation modal takes up to 840 characters, the same limit the provider accepts in a single request."],
      ["Can I choose different voices?", "Yes. Every voice available to your tenant appears in the voice picker, and each one can be previewed before you generate."],
      ["Can I change how fast the voice speaks?", "Yes. Voice speed is adjustable from 0.5× to 1.5×."],
      ["Can I clone my voice?", "Voice cloning is not enabled in this build. The control is visible and marked as coming soon."],
    ],
  },
  {
    group: "Video Generation",
    qa: [
      ["How does the video creation process work?", "Pick an avatar, choose a voice, write your script, then generate. The request goes to your tenant's video provider and the result appears under My Videos."],
      ["How long does it take to generate a video?", "Usually a few minutes, depending on script length and queue. My Videos polls every five seconds and updates the card in place, so you can leave the page and come back."],
      ["Can I download my generated videos?", "Yes. Open a finished video and use Download, or share its watch page link."],
      ["What happens if generation fails?", "The card is marked Failed and you can try again. Nothing is charged for a failed render."],
    ],
  },
  {
    group: "Quality and Uploads",
    qa: [
      ["How can I get the best avatar quality?", "Start from a high-resolution, evenly lit, front-facing photo, and keep scripts conversational — natural phrasing lip-syncs better than dense text."],
      ["Why does my avatar video look unnatural?", "Usually the source photo: side angles, low light, heavy filters and partial occlusion all degrade the result. Re-training from a cleaner photo is the fastest fix."],
      ["Why is my upload rejected?", "Either the format or the size. Photos must be JPG, PNG, GIF or WEBP up to 10MB; videos MP4, MOV or WEBM up to 100MB; clip reference images up to 30MB."],
    ],
  },
  {
    group: "Tokens, Plans, and Billing",
    qa: [
      ["What are tokens?", "Generation credits. Each video consumes credits from the plan attached to your ibl.ai tenant."],
      ["Why did my tokens decrease?", "Generating a video consumes credits. Browsing the gallery, previewing voices and editing scripts do not."],
      ["What happens if I run out of tokens?", "Generation is refused until the balance renews or the plan is upgraded. Existing videos remain available."],
    ],
  },
  {
    group: "Privacy and Usage Rights",
    qa: [
      ["Is my uploaded content private?", "Uploads go to your own tenant's provider account. This app never exposes provider keys to the browser: they stay on the tenant and are resolved server-side for each request."],
      ["Can I use my generated videos commercially?", "That depends on the terms of the plan attached to your tenant and of the underlying video provider. Check both before commercial use."],
      ["Can I delete my twin?", "Yes. Create Twin shows a Delete twin control once a twin exists, which frees the one-per-account slot."],
    ],
  },
  {
    group: "Troubleshooting",
    qa: [
      ["My video is taking too long to generate. What should I do?", "Leave it — the card keeps polling and updates itself. If it is still pending after roughly fifteen minutes, generate it again."],
      ["My avatar is not syncing well with the audio.", "Long sentences without punctuation are the usual cause. Break the script into shorter sentences and re-generate."],
      ["I see \"HeyGen integration required\".", "Your tenant has no video-provider credential yet. Add one named heygen in your ibl.ai integration settings and every generation screen activates without any further change."],
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[var(--canvas-muted)] px-4 py-10">
      <div className="mx-auto w-full max-w-[760px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <span aria-hidden="true" className="twin-gradient flex h-[30px] w-[29px] items-center justify-center rounded-[7px] text-[13px] font-bold">M</span>
          <span className="flex flex-col leading-[1.05]">
            <span className="text-[15px] font-medium text-[var(--brand)]">memorare</span>
            <span className="twin-gradient-text text-[17px] font-bold">twin</span>
          </span>
        </Link>

        <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-[var(--content-title)]">Frequently Asked Questions</h1>
        <p className="mt-2 mb-8 text-[14px] text-[var(--content-caption)]">Everything you need to know about creating AI avatar videos with Memorare Twin.</p>

        {GROUPS.map(({ group, qa }) => (
          <section key={group} className="mb-8">
            <h2 className="mb-3 inline-block rounded-[var(--radius-pill)] bg-[var(--composer-chip)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--brand)]">{group}</h2>
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
              {qa.map(([q, a], i) => (
                <details key={q} className={i ? "border-t border-[var(--border)]" : ""}>
                  <summary className="cursor-pointer list-none px-4 py-3.5 text-[14px] font-medium text-[var(--content-title)] hover:bg-[var(--canvas-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)]">
                    {q}
                  </summary>
                  <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-[var(--content-caption)]">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-10 text-center text-[12.5px] text-[var(--content-caption)]">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
        </p>
      </div>
    </main>
  );
}

/**
 * Twin's FAQ, lifted verbatim from twin.memorare.ai/faq: eight sections,
 * forty-five questions. Kept as data so the page stays markup only.
 */

export interface FaqSection {
  section: string;
  items: { q: string; a: string }[];
}

export const FAQ: FaqSection[] = [
  {
    section: "Getting Started",
    items: [
      {
        q: "What is Memorare Twin?",
        a: "Memorare Twin is an AI-powered video creation platform that helps you create professional avatar videos using scripts, voices, and AI-generated presenters. It is designed for creators, educators, businesses, coaches, marketers, and anyone who wants to produce videos faster without needing a studio, camera, or editing team.",
      },
      {
        q: "Who is Memorare Twin for?",
        a: "Memorare Twin is made for instructors, creators, coaches, entrepreneurs, business owners, marketing teams, educators, and organizations that need to create professional videos quickly and consistently.",
      },
      {
        q: "What can I create with Memorare Twin?",
        a: "You can create AI avatar videos for online courses, product explainers, social media content, training videos, sales presentations, onboarding, customer support, marketing campaigns, and educational lessons.",
      },
      {
        q: "Do I need video editing experience?",
        a: "No. Memorare Twin is designed to make video creation simple. You can start with a script, select or create an avatar, choose a voice, and generate a professional-looking video without advanced editing skills.",
      },
      {
        q: "How do I create my first AI avatar video?",
        a: "The basic process is simple: choose or create an avatar, add your script, select a voice, configure the video, and generate your final video. Once the video is ready, you can review it and use it for your business, course, presentation, or marketing campaign.",
      },
    ],
  },
  {
    section: "AI Avatars",
    items: [
      {
        q: "What is an AI avatar?",
        a: "An AI avatar is a digital presenter that can appear on screen and deliver your message using realistic facial movement, voice, and lip-sync. It helps you create videos without needing to film yourself every time.",
      },
      {
        q: "Can I create an avatar of myself?",
        a: "Yes, depending on the available features in your account, you may be able to create a custom avatar using your own image or video reference. For best results, use high-quality footage or images with good lighting, a clear face, and minimal background distractions.",
      },
      {
        q: "Can I use pre-built avatars?",
        a: "Yes. If available in your workspace, you can choose from pre-built avatars and use them as presenters for your videos.",
      },
      {
        q: "Can I use avatars for business videos?",
        a: "Yes. AI avatars are ideal for business communication, training, product demos, internal updates, sales videos, customer education, and marketing content.",
      },
      {
        q: "Can I create an avatar of another person?",
        a: "You should only create avatars of real people when you have clear permission or the necessary rights. Do not upload someone else's face, voice, or likeness without consent.",
      },
      {
        q: "What type of image should I upload for a custom avatar?",
        a: "Use a front-facing image with good lighting, a neutral expression, and a clean background. The face should be clearly visible and not cropped. Avoid blurry images, heavy filters, sunglasses, extreme angles, or strong shadows.",
      },
      {
        q: "What type of video works best for a custom avatar?",
        a: "A short, well-lit video with the person looking toward the camera usually works best. Avoid shaky footage, background noise, dramatic head movement, multiple people in the frame, or low-resolution video.",
      },
    ],
  },
  {
    section: "Scripts and Voices",
    items: [
      {
        q: "Can I write my own script?",
        a: "Yes. You can write your own script and use it as the spoken content for your avatar video.",
      },
      {
        q: "Can AI help me write the script?",
        a: "Yes. If script generation is enabled, Memorare Twin can help you create or improve scripts for different use cases, such as training videos, marketing videos, tutorials, course lessons, product explainers, onboarding content, and social media videos.",
      },
      {
        q: "Can I choose different voices?",
        a: "Yes. Depending on your plan and available integrations, you may be able to choose from different AI voices, accents, tones, and languages.",
      },
      {
        q: "Can I create videos in different languages?",
        a: "Yes, if multilingual voice generation is available in your account. This is useful for creating training, marketing, and educational content for different audiences.",
      },
      {
        q: "How can I make the voice sound more natural?",
        a: "Use short sentences, natural punctuation, and a clear conversational tone. Avoid overly long paragraphs, complex wording, or scripts that are too fast. For best results, write the script the way you want it to be spoken.",
      },
      {
        q: "Can I use my own voice?",
        a: "Depending on the available features in your account, you may be able to use a custom or cloned voice. If this feature is available, make sure you only use a voice you own or have permission to use.",
      },
    ],
  },
  {
    section: "Video Generation",
    items: [
      {
        q: "How does the video creation process work?",
        a: "The video creation process usually includes selecting an avatar, adding a script, choosing a voice, configuring the video settings, and generating the final video.",
      },
      {
        q: "How long does it take to generate a video?",
        a: "Generation time depends on video length, avatar type, server load, and selected quality. Short videos may generate faster, while longer or higher-quality videos can take more time.",
      },
      {
        q: "Can I create short videos for social media?",
        a: "Yes. Memorare Twin can be used to create short-form videos for platforms like Instagram, TikTok, YouTube Shorts, LinkedIn, and Facebook.",
      },
      {
        q: "Can I create longer training or course videos?",
        a: "Yes. Memorare Twin is also useful for longer educational, training, and presentation videos. For best results, divide long content into shorter sections or modules.",
      },
      {
        q: "Can I edit my video after it is generated?",
        a: "Depending on the available tools in your account, you may be able to revise your script, change the voice, select another avatar, or regenerate the video. For major changes, it is usually best to adjust the script and create a new version.",
      },
      {
        q: "Can I download my generated videos?",
        a: "If downloading is available in your account, you can export your final videos and use them in presentations, courses, websites, social media, ads, and internal training.",
      },
    ],
  },
  {
    section: "Quality and Uploads",
    items: [
      {
        q: "How can I get the best avatar quality?",
        a: "Use clear, high-resolution images or videos, good lighting, a stable camera, a visible face, and clean audio if a voice reference is required. Avoid blurry footage, strong shadows, sunglasses, heavy filters, or extreme angles.",
      },
      {
        q: "Why does my avatar video look unnatural?",
        a: "Avatar quality can be affected by low-quality source images, poor lighting, unclear facial features, very fast speech, overly long scripts, unsupported input formats, or extreme facial angles.",
      },
      {
        q: "Why is the lip-sync not perfect?",
        a: "Lip-sync quality can be affected by voice speed, script pacing, audio clarity, avatar source quality, pronunciation, and video processing limitations. Try using shorter sentences, natural punctuation, and a clear voice.",
      },
      {
        q: "What should I avoid when uploading media?",
        a: "Avoid low-resolution images, blurry videos, dark lighting, strong filters, multiple faces, distracting backgrounds, copyrighted material you do not own, and files that do not meet the platform requirements.",
      },
      {
        q: "My upload failed. What should I check?",
        a: "Make sure your file format is supported, the file is not too large, your internet connection is stable, and the image or video quality meets the recommended guidelines. If the issue continues, try uploading a smaller or cleaner file.",
      },
    ],
  },
  {
    section: "Tokens, Plans, and Billing",
    items: [
      {
        q: "What are tokens?",
        a: "Tokens are usage credits that may be used when generating videos, processing scripts, creating avatars, testing voices, or using AI-powered features.",
      },
      {
        q: "Why did my tokens decrease?",
        a: "Tokens may be consumed when you generate a video, test a voice, create an avatar, process media, or use AI generation tools.",
      },
      {
        q: "What happens if I run out of tokens?",
        a: "If your token balance reaches zero, you may need to upgrade your plan, purchase more credits, or wait until your usage resets, depending on your subscription.",
      },
      {
        q: "Can I try Memorare Twin before paying?",
        a: "If a free plan or trial is available, you can test the platform before upgrading. Available features, video length, quality, and usage limits may vary depending on your account.",
      },
      {
        q: "Are tokens refunded if a video fails?",
        a: "Token refund policies may depend on the type of failure and the platform settings. If a video fails and tokens were consumed, contact support with the details of the issue.",
      },
    ],
  },
  {
    section: "Privacy and Usage Rights",
    items: [
      {
        q: "Can I use my generated videos commercially?",
        a: "In most cases, yes, depending on your plan, your content, and the rights associated with the avatars, voices, images, and media you use. You should only upload content you own or have permission to use.",
      },
      {
        q: "Is my uploaded content private?",
        a: "Uploaded content should be handled according to the platform's privacy policy and account settings. For sensitive business, education, or client content, review your privacy and data usage terms before uploading.",
      },
      {
        q: "Can I delete my uploaded media?",
        a: "If media management is available in your account, you should be able to remove uploaded assets from your library. For permanent deletion or account-level data requests, contact support.",
      },
      {
        q: "Can I upload copyrighted content?",
        a: "You should only upload content that you own, created yourself, licensed properly, or have permission to use. Avoid uploading copyrighted images, videos, voices, music, logos, or likenesses without the required rights.",
      },
      {
        q: "Can I use the avatar videos for ads?",
        a: "Yes, you can use avatar videos for advertising if your plan allows commercial usage and your content complies with all applicable advertising, platform, and intellectual property rules.",
      },
    ],
  },
  {
    section: "Troubleshooting",
    items: [
      {
        q: "My video is taking too long to generate. What should I do?",
        a: "Wait a few minutes and refresh your video library. If the video remains stuck, check your internet connection, reduce the script length, try again, or contact support.",
      },
      {
        q: "My avatar is not syncing well with the voice. Why?",
        a: "Lip-sync quality can be affected by script pacing, voice speed, audio clarity, avatar source quality, or processing limitations. Try using shorter sentences, natural punctuation, and a clear voice.",
      },
      {
        q: "My video generation failed. What should I do?",
        a: "Try reducing the script length, checking your uploaded media, confirming that your files meet the platform requirements, and generating the video again. If the issue continues, contact support with screenshots and details.",
      },
      {
        q: "The voice sounds too fast. How can I improve it?",
        a: "Rewrite the script with shorter sentences and more punctuation. Add natural breaks between ideas. Avoid long paragraphs. If voice speed controls are available, reduce the speed slightly.",
      },
      {
        q: "The video does not look the way I expected. What can I change?",
        a: "You can try using a clearer avatar image, a shorter script, a different voice, better punctuation, or a different avatar style. For best results, test short clips before generating longer videos.",
      },
      {
        q: "Who should I contact for help?",
        a: "If you need help, contact support with your account email, a description of the issue, and screenshots or details about the video, avatar, script, voice, or file you were working with.",
      },
    ],
  },
];

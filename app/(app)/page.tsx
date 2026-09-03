"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useHeygenCredential } from "@/hooks/use-heygen-credential";

export default function Home() {
  const router = useRouter();
  const heygen = useHeygenCredential();

  useEffect(() => {
    if (heygen === "checking") return;
    router.replace(heygen === "ok" ? "/ai-avatar/generate" : "/ai-avatar/my");
  }, [heygen, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-[13.5px] text-[var(--content-caption)]">Redirecting…</p>
    </div>
  );
}

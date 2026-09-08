import { redirect } from "next/navigation";

// The starter's SDK profile page. Profile settings live in the Settings
// dialog, so this route only sends people home.
export default function ProfilePage() {
  redirect("/");
}

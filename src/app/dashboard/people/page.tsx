import { redirect } from "next/navigation";

/** People directory moved under Invites; keep URL for bookmarks. */
export default function PeopleRedirectPage() {
  redirect("/dashboard/invites");
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { linkProfileToPerson } from "@/actions/people";
import { Button } from "@/ui/primitives/button";
import { Label } from "@/ui/primitives/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  if (!["owner", "pm"].includes(me!.role)) {
    redirect("/dashboard");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, person_id")
    .eq("org_id", me!.org_id!)
    .order("display_name");

  const { data: people } = await supabase
    .from("people")
    .select("id, full_name")
    .eq("org_id", me!.org_id!)
    .order("full_name");

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Team accounts</CardTitle>
          <CardDescription>
            Link each login to a person record so employees can use Check in / out for themselves.
          </CardDescription>
        </CardHeader>
      </Card>

      <ul className="space-y-4">
        {(profiles ?? []).map((p) => (
          <li key={p.id}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.display_name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {p.email} · {p.role}
                </p>
              </CardHeader>
              <CardContent>
                <form action={linkProfileToPerson.bind(null, p.id)} className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1 space-y-2">
                    <Label htmlFor={`person-${p.id}`}>Linked person</Label>
                    <NativeSelect
                      id={`person-${p.id}`}
                      name="person_id"
                      defaultValue={p.person_id ?? ""}
                      className="w-full max-w-md"
                    >
                      <NativeSelectOption value="">— None —</NativeSelectOption>
                      {(people ?? []).map((person) => (
                        <NativeSelectOption key={person.id} value={person.id}>
                          {person.full_name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button type="submit" size="sm">
                    Save link
                  </Button>
                </form>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

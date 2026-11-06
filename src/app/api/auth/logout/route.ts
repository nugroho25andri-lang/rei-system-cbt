import { logAdminActivity } from "@/lib/activity";
import { clearAdminSession, getAdminSession } from "@/lib/session";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session) await logAdminActivity({ action: "logout", session, detail: "Keluar dari dashboard admin." });
  await clearAdminSession();
  return redirectTo(request, "/login");
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (session) await logAdminActivity({ action: "logout", session, detail: "Keluar dari dashboard admin." });
  await clearAdminSession();
  return redirectTo(request, "/login");
}

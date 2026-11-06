import { clearEmployeeSession } from "@/lib/employee-session";
import { redirectTo } from "@/lib/redirect";
export async function GET(request: Request) { await clearEmployeeSession(); return redirectTo(request, "/employe"); }

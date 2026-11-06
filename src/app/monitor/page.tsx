import { db } from "@/lib/db";
import Refresh from "./refresh";

export const dynamic = "force-dynamic";
type Log = { last_activity: string | Date; nama_peserta: string; ip_address: string; user_agent: string };
export default async function MonitorPage() {
  const [rows] = await db.execute("SELECT last_activity,nama_peserta,ip_address,user_agent FROM system_logs ORDER BY last_activity DESC LIMIT 50");
  return <main className="monitor-page"><Refresh /><header><h1>SYSTEM LOG MONITOR</h1><p>Status: <b>ONLINE</b> | Real-time connection tracking</p></header><div className="monitor-table"><table><thead><tr><th>TIMESTAMP</th><th>USER / ACTIVITY</th><th>IP ADDRESS</th><th>DEVICE INFO</th></tr></thead><tbody>{(rows as Log[]).map((row, index) => <tr key={`${row.last_activity}-${index}`}><td>{String(row.last_activity)}</td><td>{row.nama_peserta}</td><td><code>{row.ip_address}</code></td><td className="user-agent">{row.user_agent}</td></tr>)}</tbody></table></div><a href="/monitor">REFRESH LOG</a></main>;
}

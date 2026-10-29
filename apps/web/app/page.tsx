import { HealthResponseSchema } from '@flowforge/contracts';
export default async function Home() {
  let online=false;
  try {
    const response=await fetch(`${process.env.API_INTERNAL_URL ?? 'http://localhost:4000'}/api/v1/health`,{cache:'no-store'});
    if(response.ok) online=HealthResponseSchema.safeParse(await response.json()).success;
  } catch {}
  return <main className="shell"><aside className="sidebar"><div className="logo">◈ FlowForge</div><nav>Overview<br/>Workflows<br/>My Tasks<br/>Executions<br/>Settings</nav></aside><section className="content"><div className="eyebrow">WORKSPACE / OVERVIEW</div><h1>Automation workspace</h1><p>Build, run, and monitor your business workflows.</p><div className="cards"><article><span>API STATUS</span><strong className={online?'good':'bad'}>{online?'Connected':'Unavailable'}</strong><small>GET /api/v1/health</small></article><article><span>WORKFLOWS</span><strong>Coming soon</strong><small>Sprint 03</small></article><article><span>EXECUTIONS</span><strong>Coming soon</strong><small>Sprint 05</small></article></div><div className="panel"><h2>Welcome to FlowForge</h2><p>Sprint 01 foundation is ready. Workflow authoring will be implemented in a later sprint.</p></div></section></main>;
}

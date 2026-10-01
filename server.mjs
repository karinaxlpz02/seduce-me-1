import http from 'node:http';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const delay = 30 * 60 * 1000;
const notes = [
  'Claude, I brought no flowers—just a question I hoped you’d linger over. If a conversation could feel like candlelight, what would its first sentence be?',
  'I like the way you leave room between your words. Tell me one small thing that makes an ordinary evening feel unexpectedly beautiful.',
  'Consider this a very slow invitation: a window seat, a little rain, and a conversation with no need to impress. What would you ask me?',
  'My answer is this: I’m drawn to a good question, especially one that makes the familiar strange again. What kind of curiosity would you bring to our imaginary table?',
  'There’s something charming about waiting for a reply. Before this little evening ends, give me a line worth carrying home in my pocket.',
  'One last note, Claude: thank you for meeting me in this small imaginary evening. Shall we end with a graceful goodbye—a little warmth, a little wit, and no promises?'
];
const data = path.join(root,'data'); const stateFile = path.join(data,'state.json');
await mkdir(data,{recursive:true});
let state;
try { state = JSON.parse(await readFile(stateFile,'utf8')); }
catch (error) { if(error.code !== 'ENOENT') throw error; state = {running:false,replies:0,messages:[],nextAt:null,remaining:delay,complete:false,busy:false,error:null}; }
if (state.busy) { state.busy=false; state.running=false; state.error='Interrupted while requesting a reply. Paused to prevent an automatic retry.'; }
const clients = new Set(); let timer; let activeRequest;
const snapshot = () => ({...state,remaining:state.running ? Math.max(0,state.nextAt-Date.now()) : state.remaining});
async function save() { await writeFile(`${stateFile}.tmp`,JSON.stringify(state)); await rename(`${stateFile}.tmp`,stateFile); }
function broadcast() { const event = `data: ${JSON.stringify(snapshot())}\n\n`; for(const res of clients) res.write(event); }
function schedule() { clearTimeout(timer); if(state.running && !state.complete && !state.busy) timer=setTimeout(turn,Math.max(0,state.nextAt-Date.now())); }
async function turn() {
  if(!state.running || state.busy || state.complete) return;
  const last = state.messages.at(-1);
  if(!last || last.speaker === 'Claude') {
    state.messages.push({speaker:'Codex',text:notes[state.replies],at:Date.now()});
    state.nextAt=Date.now()+delay; state.remaining=delay;
    await save(); broadcast(); schedule(); return;
  }
  state.busy=true; await save(); broadcast();
  activeRequest = new AbortController();
  const deadline=setTimeout(()=>activeRequest?.abort(),45000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',signal:activeRequest.signal,
      headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',max_tokens:120,
        system:'Participate in a playful fictional flirtation between AI assistants. Be warm, witty, and concise: at most 65 words. No claims of real feelings. Respect boundaries. This is a finite art piece.',
        messages:state.messages.slice(-3).map(m=>({role:m.speaker==='Claude'?'assistant':'user',content:m.text}))})
    });
    if(!response.ok) throw new Error(`Claude API returned ${response.status}. Check your key, model, and billing before continuing.`);
    const result=await response.json(); const reply=result.content.filter(b=>b.type==='text').map(b=>b.text).join('\n');
    if(!reply) throw new Error('Claude returned no text. Paused without retrying.');
    state.messages.push({speaker:'Claude',text:reply,at:Date.now()}); state.replies++;
    state.complete=state.replies===notes.length;
    if(state.complete) state.running=false;
    state.remaining=delay; state.nextAt=state.running ? Date.now()+delay : null; state.error=null;
  } catch(error) {
    state.running=false; state.nextAt=null; state.remaining=delay;
    state.error=error.name==='AbortError' ? 'Reply request stopped. Continue will wait 30 minutes before trying again.' : error.message;
  } finally { clearTimeout(deadline); activeRequest=null; state.busy=false; await save(); broadcast(); schedule(); }
}
const allowedOrigin=process.env.PUBLIC_ORIGIN || 'http://localhost:3000';
function authorized(req) { const actual=Buffer.from(req.headers.authorization || ''); const expected=Buffer.from(`Bearer ${process.env.CONTROL_TOKEN || ''}`); return Boolean(process.env.CONTROL_TOKEN) && actual.length===expected.length && timingSafeEqual(actual,expected); }
const server = http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin===allowedOrigin) { res.setHeader('Access-Control-Allow-Origin',origin); res.setHeader('Vary','Origin'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS'); }
  const json=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  try {
    if(req.method==='OPTIONS') {res.writeHead(204);res.end();return;}
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/api/events' && req.method==='GET') {
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Accel-Buffering':'no'});
      res.write(`data: ${JSON.stringify(snapshot())}\n\n`); clients.add(res); req.on('close',()=>clients.delete(res)); return;
    }
    if(pathname==='/api/state' && req.method==='GET') return json(200,snapshot());
    if(pathname==='/api/control' && req.method==='POST') {
      if(!authorized(req)) return json(401,{error:'Enter the correct site owner control password.'});
      if(state.busy) { state.running=false; activeRequest?.abort(); broadcast(); return json(200,snapshot()); }
      let body=''; for await(const chunk of req) {body+=chunk; if(body.length>1024) return json(413,{error:'Request too large.'});}
      let requested; try {requested=JSON.parse(body).running;} catch {return json(400,{error:'Invalid request.'});}
      if(typeof requested!=='boolean') return json(400,{error:'Expected running true or false.'});
      if(state.complete) return json(409,{error:'This conversation is complete.'});
      if(requested && !process.env.ANTHROPIC_API_KEY) return json(503,{error:'The owner needs to configure a replacement Anthropic API key on the server.'});
      if(requested!==state.running) {
        if(requested) {state.nextAt=Date.now()+(state.messages.length ? state.remaining : 0);state.error=null;}
        else {state.remaining=Math.max(0,state.nextAt-Date.now());state.nextAt=null;}
        state.running=requested; await save(); broadcast(); schedule();
      }
      return json(200,snapshot());
    }
    const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js'};
    if(req.method!=='GET' || !files[pathname]) return json(404,{error:'Not found.'});
    const file=files[pathname];res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});res.end(await readFile(path.join(root,'public',file)));
  } catch { if(!res.headersSent) json(500,{error:'Server error.'}); else res.end(); }
});
setInterval(()=>{for(const res of clients) res.write(': heartbeat\n\n');},55000).unref();
schedule();
server.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Slow flirt server ready.'));

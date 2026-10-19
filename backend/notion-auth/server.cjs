'use strict';
// Minimal OAuth code exchange broker. No conversation endpoint, no body logging.
// Node 22+. Deploy one process behind HTTPS; ephemeral state intentionally expires
// on restart. Access tokens exist only during the one-time exchange handoff.
const http=require('node:http'),crypto=require('node:crypto');
function createBroker({clientId,clientSecret,publicOrigin,extensionId,fetcher=fetch,clock=Date.now}){
 if(!clientId||!clientSecret||!/^https:\/\//.test(publicOrigin)||!/^[a-p]{32}$/.test(extensionId))throw Error('Missing or invalid broker configuration');
 const states=new Map(),handoffs=new Map(),origin='chrome-extension://'+extensionId,redirect='https://'+extensionId+'.chromiumapp.org/notion',callback=publicOrigin+'/callback';
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 function expire(map,key,ms){const t=setTimeout(()=>{const item=map.get(key);if(item?.accessToken)item.accessToken='';map.delete(key);},ms);t.unref();}
 function clean(){for(const map of [states,handoffs])for(const[k,v]of map)if(v.expires<clock())map.delete(k);}
 function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
 async function json(req){let b='';for await(const chunk of req){b+=chunk;if(b.length>4096)throw Error('large');}return JSON.parse(b);}
 const handler=async(req,res)=>{clean();res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');const u=new URL(req.url,publicOrigin);
  if(req.headers.origin&&req.headers.origin!==origin){send(res,403,{error:'origin'});return;}if(req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);res.end();return;}
  try{
   if(req.method==='GET'&&u.pathname==='/start'){
    if(u.searchParams.get('redirect')!==redirect||!/^[a-f0-9]{64}$/.test(u.searchParams.get('challenge')||'')){send(res,400,{error:'invalid_request'});return;}
    if(states.size+handoffs.size>=500){send(res,429,{error:'busy'});return;}
    const state=crypto.randomBytes(32).toString('hex');states.set(state,{challenge:u.searchParams.get('challenge'),expires:clock()+600000});expire(states,state,600000);res.writeHead(302,{Location:'https://api.notion.com/v1/oauth/authorize?'+new URLSearchParams({client_id:clientId,response_type:'code',owner:'user',redirect_uri:callback,state})});res.end();return;
   }
   if(req.method==='GET'&&u.pathname==='/callback'){
    const state=u.searchParams.get('state'),entry=states.get(state);states.delete(state);if(!entry){send(res,400,{error:'invalid_state'});return;}
    if(u.searchParams.has('error')||!u.searchParams.get('code')){res.writeHead(302,{Location:redirect+'#cancelled=1'});res.end();return;}
    const response=await fetcher('https://api.notion.com/v1/oauth/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Basic '+Buffer.from(clientId+':'+clientSecret).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',code:u.searchParams.get('code'),redirect_uri:callback})});
    if(!response.ok){send(res,502,{error:'exchange_failed'});return;}const token=await response.json();if(!token.access_token){send(res,502,{error:'exchange_failed'});return;}
    const code=crypto.randomBytes(32).toString('hex');handoffs.set(code,{accessToken:token.access_token,challenge:entry.challenge,expires:clock()+60000});expire(handoffs,code,60000);res.writeHead(302,{Location:redirect+'#code='+code});res.end();return;
   }
   if(req.method==='POST'&&u.pathname==='/exchange'){
    if(req.headers.origin!==origin){send(res,403,{error:'origin'});return;}
    const data=await json(req),entry=handoffs.get(data.code);if(!entry||typeof data.verifier!=='string'||hash(data.verifier)!==entry.challenge){send(res,403,{error:'invalid_handoff'});return;}
    handoffs.delete(data.code);send(res,200,{access_token:entry.accessToken});entry.accessToken='';return;
   }
   send(res,404,{error:'not_found'});
  }catch{send(res,400,{error:'request_failed'});}
 };
 return http.createServer((req,res)=>{handler(req,res).catch(()=>{if(!res.headersSent)send(res,500,{error:'server_error'});else res.end();});});
}
if(require.main===module){const server=createBroker({clientId:process.env.NOTION_CLIENT_ID,clientSecret:process.env.NOTION_CLIENT_SECRET,publicOrigin:process.env.PUBLIC_ORIGIN,extensionId:process.env.EXTENSION_ID});server.listen(Number(process.env.PORT||8787),'127.0.0.1');}
module.exports={createBroker};

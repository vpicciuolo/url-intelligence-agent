#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { PROJECT, creditsBlock } from "./credits.js";
import { investigate, generateListing, compareResults } from "./agent.js";
import { renderMarkdown, renderTerminal } from "./report.js";

function banner(){
  console.log(`\n╭──────────────────────────────────────────────────────────────╮\n│  URL INTELLIGENCE AGENT                                     │\n│  URL in. Identity, evidence and intelligence out.           │\n│                                                              │\n│  HRN Innovation Technologies Ltd                            │\n│  Founder & Lead Engineer: Vincenzo Picciuolo                 │\n│  https://horno.net                                           │\n╰──────────────────────────────────────────────────────────────╯\n`);
}

async function menu(){
  banner();
  console.log(`Actions\n  1. Investigate URL\n  2. Map site\n  3. Resolve entity\n  4. Find social profiles\n  5. Audit SEO\n  6. Generate listing\n  7. Generate intelligence report\n  8. Compare two URLs\n  9. Watch/diff snapshot\n 10. Show JSON schema\n 11. About & credits\n  0. Exit\n`);
  const rl=createInterface({input,output}); const choice=await rl.question("Select action: ");
  if(choice==="0"){rl.close();return;}
  if(choice==="11"){console.log("\n"+creditsBlock());rl.close();return;}
  if(choice==="10"){console.log(JSON.stringify({investigate:"URL -> IntelligenceResult",listing:"IntelligenceResult -> Listing",snapshot:"fingerprint + observedAt"},null,2));rl.close();return;}
  const url=await rl.question("Public URL: ");
  if(choice==="8"){const url2=await rl.question("Second public URL: "); console.log(JSON.stringify(compareResults(await investigate(url),await investigate(url2)),null,2));rl.close();return;}
  const r=await investigate(url);
  if(choice==="2") console.log(JSON.stringify({meta:r.meta,importantPages:r.importantPages,pages:r.pages.map(p=>({url:p.url,title:p.title,status:p.status}))},null,2));
  else if(choice==="3") console.log(JSON.stringify({meta:r.meta,entity:r.entity,contradictions:r.contradictions},null,2));
  else if(choice==="4") console.log(JSON.stringify({meta:r.meta,socials:r.socials},null,2));
  else if(choice==="5") console.log(JSON.stringify({meta:r.meta,seo:r.seo},null,2));
  else if(choice==="6") console.log(JSON.stringify(generateListing(r),null,2));
  else if(choice==="7") {const file=`report-${Date.now()}.md`; await writeFile(file,renderMarkdown(r)); console.log(renderTerminal(r)); console.log(`\nReport written: ${file}`);}
  else if(choice==="9") console.log(JSON.stringify({meta:r.meta,url:r.finalUrl,fingerprint:r.fingerprint,observedAt:r.observedAt},null,2));
  else {console.log(renderTerminal(r)); console.log("\n"+JSON.stringify(r,null,2));}
  rl.close();
}

async function serve(port:number){
  const server=createServer(async(req,res)=>{
    res.setHeader("content-type","application/json; charset=utf-8");
    try {
      const u=new URL(req.url||"/",`http://${req.headers.host||"localhost"}`);
      if(u.pathname==="/health"){res.end(JSON.stringify({ok:true,project:PROJECT}));return;}
      if(u.pathname==="/investigate"){const target=u.searchParams.get("url");if(!target)throw new Error("Missing ?url=");res.end(JSON.stringify(await investigate(target),null,2));return;}
      res.statusCode=404;res.end(JSON.stringify({error:"Not found",meta:PROJECT}));
    } catch(e){res.statusCode=400;res.end(JSON.stringify({error:e instanceof Error?e.message:String(e),meta:PROJECT}));}
  });
  server.listen(port,()=>console.log(`${PROJECT.name} API listening on http://localhost:${port}\n${creditsBlock()}`));
}

async function mcp(){
  banner(); console.error("MCP-style JSON-RPC mode active. Send one JSON object per line on stdin.");
  const rl=createInterface({input,output:undefined});
  for await (const line of rl){
    try{
      const req=JSON.parse(line); let result:any;
      if(req.method==="tools/list") result={tools:["investigate_url","map_site","resolve_entity","find_social_profiles","audit_seo","generate_listing","compare_urls","create_snapshot"]};
      else if(req.method==="tools/call"){
        const name=req.params?.name; const args=req.params?.arguments||{};
        if(name==="compare_urls") result=compareResults(await investigate(args.url),await investigate(args.url2));
        else {const r=await investigate(args.url,args.profile); result=name==="map_site"?{meta:r.meta,importantPages:r.importantPages,pages:r.pages}:name==="resolve_entity"?{meta:r.meta,entity:r.entity}:name==="find_social_profiles"?{meta:r.meta,socials:r.socials}:name==="audit_seo"?{meta:r.meta,seo:r.seo}:name==="generate_listing"?generateListing(r):name==="create_snapshot"?{meta:r.meta,url:r.finalUrl,fingerprint:r.fingerprint,observedAt:r.observedAt}:r;}
      } else throw new Error("Unknown method");
      console.log(JSON.stringify({jsonrpc:"2.0",id:req.id??null,result}));
    }catch(e){console.log(JSON.stringify({jsonrpc:"2.0",id:null,error:{code:-32000,message:e instanceof Error?e.message:String(e)},meta:PROJECT}));}
  }
}

async function command(args:string[]){
  const [cmd,...rest]=args;
  if(!cmd)return menu();
  if(cmd==="serve")return serve(Number(rest[rest.indexOf("--port")+1]||8787));
  if(cmd==="mcp")return mcp();
  if(cmd==="about"){banner();console.log(creditsBlock());return;}
  const url=rest.find(x=>/^https?:\/\//.test(x)); if(!url)throw new Error("Provide a public http/https URL");
  const profileIndex=rest.indexOf("--profile"); const profile=profileIndex>=0?rest[profileIndex+1]:undefined;
  const r=await investigate(url,profile);
  if(cmd==="investigate") console.log(renderTerminal(r)+"\n\n"+JSON.stringify(r,null,2));
  else if(cmd==="map-site") console.log(JSON.stringify({meta:r.meta,importantPages:r.importantPages,pages:r.pages},null,2));
  else if(cmd==="resolve-entity") console.log(JSON.stringify({meta:r.meta,entity:r.entity},null,2));
  else if(cmd==="find-socials") console.log(JSON.stringify({meta:r.meta,socials:r.socials},null,2));
  else if(cmd==="audit-seo") console.log(JSON.stringify({meta:r.meta,seo:r.seo},null,2));
  else if(cmd==="generate-listing") console.log(JSON.stringify(generateListing(r),null,2));
  else if(cmd==="report"){const path=rest[rest.indexOf("--out")+1]||"url-intelligence-report.md";await writeFile(path,renderMarkdown(r));console.log(renderTerminal(r)+`\nReport: ${path}`);}
  else if(cmd==="snapshot") console.log(JSON.stringify({meta:r.meta,url:r.finalUrl,fingerprint:r.fingerprint,observedAt:r.observedAt},null,2));
  else if(cmd==="diff"){const file=rest.find(x=>x.endsWith(".json")); if(!file)throw new Error("diff requires a snapshot JSON file"); const old=JSON.parse(await readFile(file,"utf8")); console.log(JSON.stringify({meta:r.meta,changed:old.fingerprint!==r.fingerprint,previous:old,current:{url:r.finalUrl,fingerprint:r.fingerprint,observedAt:r.observedAt}},null,2));}
  else throw new Error(`Unknown command: ${cmd}`);
}

command(process.argv.slice(2)).catch(e=>{console.error(`ERROR: ${e instanceof Error?e.message:String(e)}\n${creditsBlock()}`);process.exitCode=1;});

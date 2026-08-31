import type { IntelligenceResult } from "./types.js";

export async function reasonWithOpenAICompatible(result:IntelligenceResult, instruction:string): Promise<unknown> {
  const key=process.env.AI_API_KEY; if(!key) return {enabled:false,reason:"AI_API_KEY not configured"};
  const base=(process.env.AI_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
  const model=process.env.AI_MODEL||"gpt-5-mini";
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(`${base}/chat/completions`,{method:"POST",signal:controller.signal,headers:{"content-type":"application/json","authorization":`Bearer ${key}`},body:JSON.stringify({model,temperature:Number(process.env.AI_TEMPERATURE||0.2),max_tokens:Number(process.env.AI_MAX_TOKENS||2500),messages:[{role:"system",content:"You are an evidence-first URL intelligence analyst. Never invent facts. Use only the supplied structured evidence. Mark uncertainty explicitly."},{role:"user",content:`${instruction}\n\nEvidence:\n${JSON.stringify(result)}`}]})});
    if(!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data:any=await response.json(); return {enabled:true,model,content:data?.choices?.[0]?.message?.content??null};
  } finally { clearTimeout(timer); }
}

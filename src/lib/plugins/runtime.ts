/** Only reviewed package source returned by Rust may reach this runner. */
export function createPluginRuntime(source: string) {
  const moduleUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  const runnerUrl=URL.createObjectURL(new Blob([`
    import {parse,view,plan} from ${JSON.stringify(moduleUrl)};
    self.onmessage=({data:m})=>{
      try { let value;
        if(m.action==='parse') value=parse(m.input);
        else if(m.action==='view') value=view(m.input,m.day);
        else if(m.action==='plan') value=plan(m.input,m.now);
        else throw new Error('未知插件操作');
        self.postMessage({id:m.id,value});
      } catch(e) { self.postMessage({id:m.id,error:String(e?.message||e)}); }
    };
  `],{type:'text/javascript'}));
  const worker=new Worker(runnerUrl,{type:'module'});
  let sequence=0,closed=false;
  const pending=new Map<number,{resolve:(value:any)=>void,reject:(error:Error)=>void,timer:ReturnType<typeof setTimeout>}>();
  function close(reason='插件已停止') {
    if(closed)return;closed=true;worker.terminate();URL.revokeObjectURL(moduleUrl);URL.revokeObjectURL(runnerUrl);
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error(reason));}pending.clear();
  }
  worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;clearTimeout(p.timer);pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.value);};
  worker.onerror=()=>close('插件执行失败，请重新打开');
  return {close,call(action:string,input:any,extra:Record<string,unknown>={}):Promise<any>{
    if(closed)return Promise.reject(new Error('插件已停止'));
    return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>close('插件执行超时，已终止'),4000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,action,input,...extra});});
  }};
}

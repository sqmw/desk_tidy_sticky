<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { requestPermission } from '@tauri-apps/plugin-notification';
  import { createPluginRuntime } from '$lib/plugins/runtime';
  type Snapshot={manifest:null|{id:string;name:string;version:string},enabled:boolean,revision:number,data:any,reminderStatus:string,mobile:boolean};
  let snapshot=$state<Snapshot|null>(null),error=$state(''),busy=$state(false),rawPackage=$state(''),candidate=$state<any>(null),consent=$state(false);
  let form=$state(''),validated=$state(''),draft=$state<any>(null),rows=$state<any[]>([]),day=$state(new Date().toISOString().slice(0,10)),remaining=$state(0),uninstallConfirm=$state(false),opened=$state(false);
  let runtime:ReturnType<typeof createPluginRuntime>|null=null;
  let notice=$state('');
  async function task(work:()=>Promise<void>){if(busy)return;busy=true;error='';notice='';try{await work();}catch(e){error=String(e instanceof Error?e.message:e);}finally{busy=false;}}
  async function showRows(data:any){if(runtime)rows=await runtime.call('view',data,{day});}
  async function open(){
    runtime?.close();opened=false;
    snapshot=await invoke<Snapshot>('plugin_status');
    const source=await invoke<string>('plugin_open');runtime=createPluginRuntime(source);opened=true;
    if(snapshot?.data){form=JSON.stringify(snapshot.data,null,2);draft=await runtime.call('parse',form);validated=form;day=new Intl.DateTimeFormat('en-CA',{timeZone:draft.semester.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());await showRows(draft);}
  }
  onMount(()=>{void task(async()=>{snapshot=await invoke('plugin_status');if(snapshot?.enabled)await open();});return ()=>runtime?.close();});
  async function pickPackage(event:Event){const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;await task(async()=>{candidate=null;consent=false;if(file.size>524288)throw new Error('插件包超过512 KiB');rawPackage=await file.text();candidate=await invoke('plugin_preview',{raw:rawPackage});});}
  async function install(){await task(async()=>{snapshot=await invoke('plugin_install',{raw:rawPackage,grants:consent?['storage','reminders']:[]});candidate=null;rawPackage='';await open();});}
  async function validate(){if(!runtime)throw new Error('请先打开插件');draft=null;const value=await runtime.call('parse',form);await showRows(value);draft=value;validated=form;notice='校验通过，当前仅为预览，尚未保存。';}
  async function pickData(event:Event){const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;await task(async()=>{if(file.size>262144)throw new Error('课表超过256 KiB');form=await file.text();await validate();});}
  async function save(){await task(async()=>{if(!runtime||!snapshot||form!==validated||!draft)throw new Error('请先校验修改');const planned=await runtime.call('plan',draft,{now:Date.now()});remaining=planned.remaining;snapshot=await invoke('plugin_save',{expectedRevision:snapshot.revision,data:draft,plan:planned.events});notice='课表已保存。'+snapshot!.reminderStatus;await showRows(draft);});}
  async function lifecycle(action:string){await task(async()=>{runtime?.close();runtime=null;opened=false;snapshot=await invoke('plugin_lifecycle',{action});uninstallConfirm=false;rows=[];if(action==='enable')await open();});}
</script>

<svelte:head><title>课表插件 · Desk Tidy Sticky</title></svelte:head>
<main class="page">
  <header><p class="eyebrow">DESK TIDY STICKY</p><h1>插件与课表 <small>v0.1</small></h1><p>从本地安装课表包，数据独立保存。当前仅允许已审查的官方包，任意第三方安装尚未开放。</p></header>
  <div class="feedback" aria-live="polite">
    {#if error}<div role="alert" class="error">{error}</div>{/if}
    {#if busy}<p role="status">正在处理…</p>{:else if notice}<p role="status">{notice}</p>{/if}
  </div>
  <section aria-label="插件安装">
    <h2>本地插件包</h2><label class="file">选择 .dtplugin 文件<input aria-label="选择插件包" type="file" disabled={busy} onchange={pickPackage}/></label>
    {#if candidate}<div class="confirm"><strong>{candidate.name} {candidate.version}</strong><p>权限：独立课表存储、系统提醒。未知包和被篡改的包不会执行。</p><label><input type="checkbox" bind:checked={consent}/> 我同意这两项权限</label><button disabled={!consent||busy} onclick={install}>确认安装并打开</button><button disabled={busy} onclick={()=>candidate=null}>取消</button></div>{/if}
    {#if snapshot?.manifest}<div class="installed"><strong>{snapshot.manifest.name} {snapshot.manifest.version}</strong><span>{snapshot.enabled?'已启用':'已停用'}</span>
      <div class="actions"><button disabled={busy||!snapshot.enabled} onclick={()=>task(open)}>打开</button><button disabled={busy} onclick={()=>lifecycle(snapshot?.enabled?'disable':'enable')}>{snapshot.enabled?'停用':'启用'}</button><button disabled={busy} onclick={()=>uninstallConfirm=true}>卸载</button></div>
      {#if uninstallConfirm}<p>卸载插件代码并取消提醒，课表数据保留。</p><button disabled={busy} onclick={()=>lifecycle('uninstall')}>确认卸载（保留数据）</button><button onclick={()=>uninstallConfirm=false}>取消卸载</button>{/if}
    </div>{:else}<p class="muted">尚未安装插件。卸载后保留的数据会在重新安装时恢复。</p>{/if}
  </section>
  {#if opened}
    <section><h2>课表</h2><p>导入后先校验、预览，再保存替换当前课表。修改课程请编辑 JSON 并重新校验。</p>
      <label class="file">导入课表 JSON<input aria-label="导入课表JSON" type="file" accept=".json,application/json" disabled={busy} onchange={pickData}/></label>
      <label class="editor">课表 JSON<textarea spellcheck="false" bind:value={form} disabled={busy} rows="9" aria-label="课表JSON编辑器"></textarea></label>
      <div class="actions"><button disabled={busy||!form} onclick={()=>task(validate)}>校验并预览</button><button class="primary" disabled={busy||!draft||form!==validated} onclick={save}>保存并更新提醒</button><button disabled={busy} onclick={()=>task(async()=>{const permission=await requestPermission();if(permission!=='granted')throw new Error('通知权限未允许');})}>允许系统通知</button></div>
      {#if error}<p class="error">操作未完成：{error}</p>{:else if notice}<p class="result">{notice}</p>{/if}
      <p role="status">{snapshot?.reminderStatus}</p><p class="muted">每次最多安排最近32条未来提醒；后续请重开后点击“保存并更新提醒”补齐。{remaining>0?`另有${remaining}条尚未安排。`:''}</p>
      {#if !snapshot?.mobile}<p class="muted">当前桌面构建可使用课表；系统定时提醒的产品适配尚未完成。</p>{/if}
    </section>
    <section><h2>每日课程</h2><label>日期<input type="date" bind:value={day} onchange={()=>task(async()=>{if(draft)await showRows(draft);})}/></label>
      {#if rows.length===0}<p class="muted">当日没有课程，或尚未导入课表。</p>{:else}<ul>{#each rows as course (course.id)}<li><div><strong>{course.name}</strong><span>{course.start}–{course.end} · 第{course.week}周</span></div><p>{course.room||'未填写教室'}</p></li>{/each}</ul>{/if}
    </section>
  {/if}
</main>

<style>
  .feedback{position:sticky;top:0;z-index:5;background:#f6f7fb}.feedback:empty{display:none}.feedback p,.result{padding:10px 12px;border:1px solid #bac7dc;border-radius:8px;background:#f3f6fb;overflow-wrap:anywhere}
  .page{max-width:900px;margin:auto;padding:calc(24px + env(safe-area-inset-top)) 20px calc(32px + env(safe-area-inset-bottom));color:#202938;background:#f6f7fb;height:100dvh;overflow-y:auto;overscroll-behavior:contain;font:16px/1.6 system-ui,sans-serif;box-sizing:border-box}.eyebrow{font-size:12px;letter-spacing:.15em;color:#53647c}h1{font-size:28px;line-height:1.2;margin:6px 0 14px}h1 small{font-size:14px;font-weight:500}h2{font-size:20px;margin:0 0 10px}section{margin-top:20px;padding:20px;background:#fff;border:1px solid #dce2ed;border-radius:14px}p{margin:8px 0 14px}.muted{color:#53647c;font-size:14px}.error{padding:14px;background:#fff0ef;border:1px solid #d17670;border-radius:10px;color:#8b2620;overflow-wrap:anywhere}.actions{display:flex;gap:8px;flex-wrap:wrap}button,.file{min-height:44px;padding:8px 14px;border:1px solid #bac7dc;background:#f3f6fb;border-radius:8px;font:inherit;color:inherit;cursor:pointer;margin:4px 4px 4px 0}button.primary{background:#245bd5;color:white;border-color:#245bd5}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #7098ee;outline-offset:2px}.file{display:block}.file input{display:block;max-width:100%;margin-top:8px}.confirm,.installed{padding:14px;margin-top:12px;border:1px solid #cfdaed;border-radius:10px}.installed>span{margin-left:12px;color:#53647c}.editor{display:block;margin:16px 0}textarea{display:block;box-sizing:border-box;width:100%;padding:12px;border:1px solid #bac7dc;border-radius:8px;font:13px/1.5 ui-monospace,monospace}input[type=date]{margin-left:10px;padding:6px}ul{list-style:none;margin:12px 0 0;padding:0}li{border-top:1px solid #e3e8f0;padding:12px 0}li div{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}li span{color:#53647c;font-size:14px}li p{margin:4px 0 0}@media(max-width:480px){.page{padding-left:12px;padding-right:12px}section{padding:14px}h1{font-size:25px}}
</style>

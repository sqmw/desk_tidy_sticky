<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { requestPermission } from '@tauri-apps/plugin-notification';
  import { createPluginRuntime } from './runtime';
  import type { PluginSnapshot } from './types';
  import TimetableImport from './TimetableImport.svelte';
  import WeekGrid from './timetable/WeekGrid.svelte';
  import PluginDialog from './PluginDialog.svelte';
  import { currentWeek, weekDays, shortDate } from './timetable/week-layout.js';
  import './timetable/timetable-page.css';
  let { changed, activity = () => {} }: { changed: (value: PluginSnapshot) => Promise<void>; activity?: (pending: boolean, working: boolean) => void } = $props();
  let snapshot = $state<PluginSnapshot | null>(null), saved = $state<any>(null), preview = $state<any>(null);
  let busy = $state(true), error = $state(''), notice = $state(''), importing = $state(false), remaining = $state(0);
  let rows = $state<any[]>([]), week = $state(1), todayDate = $state(''), settings = $state(false);
  const dates = $derived(saved ? weekDays(saved.semester.startDate, week) : []);
  const semesterPosition = $derived(saved && todayDate ? currentWeek(saved.semester, todayDate) : null);
  let runtime = $state.raw<ReturnType<typeof createPluginRuntime> | null>(null);
  let alive = true;
  $effect(() => { activity(importing, busy); });
  const today = (zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  async function task(work: () => Promise<void>) {
    if (busy) return;
    busy = true; error = ''; notice = '';
    try { await work(); } catch (e) { if (alive) error = String(e instanceof Error ? e.message : e); }
    finally { if (alive) busy = false; }
  }
  async function display() {
    rows = [];
    if (saved && runtime) rows = (await Promise.all(weekDays(saved.semester.startDate, week).map(day => runtime!.call('view', saved, { day })))).flat();
  }
  function resetWeek() {
    todayDate = today(saved?.semester.timeZone || 'Asia/Shanghai');
    week = saved ? currentWeek(saved.semester, todayDate).week : 1;
  }
  async function changeWeek(next: number) { await task(async () => { week = Math.max(1, Math.min(saved.semester.weeks, next)); await display(); }); }
  async function load() {
    runtime?.close(); runtime = null;
    const status = await invoke<PluginSnapshot>('plugin_status');
    if (!alive) return;
    snapshot = status;
    const source = await invoke<string>('plugin_open');
    if (!alive) return;
    runtime = createPluginRuntime(source);
    saved = status.data ? await runtime.call('parse', JSON.stringify(status.data)) : null;
    resetWeek();
    await display();
  }
  onMount(() => { busy = false; void task(load); return () => { alive = false; runtime?.close(); }; });
  async function validate(raw: string) {
    await task(async () => {
      if (!runtime) throw new Error('插件未就绪，请重新打开课表。');
      preview = null;
      try { preview = await runtime.call('parse', raw); }
      catch (e) { throw new Error('无法导入：' + String(e instanceof Error ? e.message : e) + '。请检查是否为 Desk Tidy JSON v1。已保存课表未改变。'); }
    });
  }
  async function save() {
    await task(async () => {
      if (!runtime || !snapshot || !preview) throw new Error('请先选择并校验课表。');
      const plan = await runtime.call('plan', preview, { now: Date.now() });
      const next = await invoke<PluginSnapshot>('plugin_save', { expectedRevision: snapshot.revision, data: preview, plan: plan.events });
      snapshot = next; saved = next.data; remaining = plan.remaining;
      preview = null; importing = false;
      notice = '课表已保存，重新打开后仍可查看。';
      resetWeek(); await changed(next); await display();
    });
  }
  function cancel() { preview = null; importing = false; error = ''; notice = '已取消导入，已保存课表未改变。'; }
  export function discardImport() { cancel(); }
</script>

<div class="timetable-page">
  <header class="tt-header">
    <div class="tt-title"><span class="tt-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M8 2v5m8-5v5M8 14h2m4 0h2m-8 3h2"/></svg></span><div><h1>课表</h1>{#if saved}<p>{saved.semester.startDate.replaceAll('-','.')} 开学 <span>·</span> 共 {saved.semester.weeks} 周</p>{:else}<p>把一周的安排，放在眼前。</p>{/if}</div></div>
    <div class="tt-tools"><button class="tt-tool" disabled={busy || !runtime || importing} onclick={() => { importing = true; error = ''; notice = ''; }}><span aria-hidden="true">＋</span> 导入课表</button>{#if saved}<button class="tt-tool" aria-label="课表设置" disabled={busy} onclick={() => settings=true}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg>设置</button>{/if}</div>
  </header>
  {#if busy}<p class="tt-feedback" role="status">正在加载…</p>{/if}
  {#if error && !importing}<p class="error" role="alert">{error}</p><button disabled={busy} onclick={() => task(load)}>重新打开课表</button>{/if}
  {#if notice}<p class="tt-feedback" role="status">{notice}</p>{/if}
  {#if importing}<TimetableImport {busy} {preview} {error} initialRaw={saved ? JSON.stringify(saved, null, 2) : ''} onPreview={validate} onSave={save} onCancel={cancel}/>{/if}
  {#if saved}
    <div class="tt-weekbar">
      <div class="tt-week-title"><label class="tt-week-select"><span class="sr-only">查看周次</span><select aria-label="查看周次" value={week} disabled={busy} onchange={(event) => changeWeek(Number(event.currentTarget.value))}>{#each Array.from({length:saved.semester.weeks}, (_,i)=>i+1) as number}<option value={number}>第 {number} 周</option>{/each}</select></label><span class="tt-range">{shortDate(dates[0])} — {shortDate(dates[6])}</span></div>
      <div class="tt-week-actions"><button class="tt-arrow" aria-label="上一周" disabled={busy || week===1} onclick={() => changeWeek(week-1)}>‹</button><button class="tt-today" disabled={busy} onclick={() => task(async () => { resetWeek(); await display(); })}>回到本周</button><button class="tt-arrow" aria-label="下一周" disabled={busy || week===saved.semester.weeks} onclick={() => changeWeek(week+1)}>›</button></div>
    </div>
    {#if semesterPosition?.outside}<p class="tt-context">{semesterPosition.outside}，当前展示第 {week} 周。</p>{/if}
    <WeekGrid {dates} periods={saved.periods} {rows} today={todayDate}/>
    <footer class="tt-footer"><span>{busy ? '正在读取课程' : rows.length ? `本周 ${rows.length} 次课程` : '本周没有课程，切换周次查看其他安排'} <span class="tt-dot">·</span> 点击课程查看详情</span><button disabled={busy} onclick={() => settings=true}>提前 {saved.reminderMinutes} 分钟提醒 <span aria-hidden="true">↗</span></button></footer>
  {:else if !busy && !error && !importing}
    <div class="tt-empty"><div class="tt-empty-grid" aria-hidden="true">{#each Array.from({length:15}) as _,i}<span class:filled={[1,5,8,12].includes(i)}></span>{/each}</div><h2>从第一份课表开始</h2><p>导入课表后，这里会呈现你的一周安排。</p><button class="primary" onclick={() => importing=true}>导入第一份课表</button><small>支持 Desk Tidy 课表 JSON v1</small></div>
  {/if}
  {#if settings && saved}<PluginDialog title="课表设置" {busy} cancel={() => settings=false}>
    <div class="tt-settings"><p><span>学期开始</span><strong>{saved.semester.startDate.replaceAll('-','.')}</strong></p><p><span>学期长度</span><strong>{saved.semester.weeks} 周</strong></p><p><span>课程时区</span><strong>{saved.semester.timeZone}</strong></p><p><span>提前提醒</span><strong>{saved.reminderMinutes} 分钟</strong></p></div>
    <p class="muted">提醒设置随课表导入。修改课表 JSON 并重新保存，可更新提前时间与提醒计划。</p>
    <details><summary>通知权限与运行状态</summary><p>{snapshot?.reminderStatus === '状态已更新；打开课表时重建计划' ? '提醒计划需重新保存课表后更新。' : snapshot?.reminderStatus}</p><button disabled={busy} onclick={() => task(async () => { const permission=await requestPermission();if(permission!=='granted')throw new Error('通知权限未允许，请在系统设置中检查。');notice='已允许通知权限。'; })}>允许系统通知</button>{#if error}<p class="error" role="alert">{error}</p>{/if}<p class="muted">每次最多安排最近 32 条提醒。启用后需重新保存课表；{remaining>0 ? `另有 ${remaining} 条尚未安排。` : ''}桌面后台提醒需主程序保持运行，退出期间不提醒，重开不补发超过 5 分钟的过期提醒。实际支持情况以运行状态为准。</p></details>
    <div class="actions"><button disabled={busy || importing} onclick={() => { settings=false;importing=true; }}>编辑课表 JSON</button><button disabled={busy} onclick={() => settings=false}>完成</button></div>
  </PluginDialog>{/if}
</div>

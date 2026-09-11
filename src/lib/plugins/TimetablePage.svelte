<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { requestPermission } from '@tauri-apps/plugin-notification';
  import { createPluginRuntime } from './runtime';
  import type { PluginSnapshot } from './types';
  import TimetableImport from './TimetableImport.svelte';
  let { changed, activity = () => {} }: { changed: (value: PluginSnapshot) => Promise<void>; activity?: (pending: boolean, working: boolean) => void } = $props();
  let snapshot = $state<PluginSnapshot | null>(null), saved = $state<any>(null), preview = $state<any>(null);
  let busy = $state(true), error = $state(''), notice = $state(''), importing = $state(false), remaining = $state(0);
  let rows = $state<any[]>([]), day = $state('');
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
  async function display() { rows = saved && day && runtime ? await runtime.call('view', saved, { day }) : []; }
  async function load() {
    runtime?.close(); runtime = null;
    const status = await invoke<PluginSnapshot>('plugin_status');
    if (!alive) return;
    snapshot = status;
    const source = await invoke<string>('plugin_open');
    if (!alive) return;
    runtime = createPluginRuntime(source);
    saved = status.data ? await runtime.call('parse', JSON.stringify(status.data)) : null;
    day = today(saved?.semester.timeZone || 'Asia/Shanghai');
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
      await changed(next); await display();
    });
  }
  function cancel() { preview = null; importing = false; error = ''; notice = '已取消导入，已保存课表未改变。'; }
  export function discardImport() { cancel(); }
</script>

<header><p class="eyebrow">已安装插件 · 课表 v0.1</p><div class="title-row"><h1>课表</h1><button class="primary" disabled={busy || !runtime || importing} onclick={() => { importing = true; error = ''; notice = ''; }}>导入课表</button></div><p class="muted">你的课程、学期与上课提醒，都在这里。</p></header>
{#if busy}<p role="status">正在处理…</p>{/if}
{#if error && !importing}<p class="error" role="alert">{error}</p><button disabled={busy} onclick={() => task(load)}>重新打开课表</button>{/if}
{#if notice}<p class="success" role="status">{notice}</p>{/if}
{#if importing}<TimetableImport {busy} {preview} {error} initialRaw={saved ? JSON.stringify(saved, null, 2) : ''} onPreview={validate} onSave={save} onCancel={cancel}/>{/if}
{#if saved}
  <section><div class="title-row"><h2>每日课程</h2><label>日期 <input aria-label="查看日期" type="date" bind:value={day} disabled={busy} onchange={() => task(display)}/></label></div>
    <p class="muted">{saved.courses.length} 门课程 · 学期开始 {saved.semester.startDate} · 共 {saved.semester.weeks} 周</p>
    <div class="actions"><button disabled={busy} onclick={() => task(async () => { day = today(saved.semester.timeZone); await display(); })}>今天</button><button disabled={busy} onclick={() => task(async () => { day = saved.semester.startDate; await display(); })}>学期首日</button></div>
    {#if rows.length}<ul class="courses">{#each rows as course (course.id)}<li><div><strong>{course.start}–{course.end}</strong><span>第 {course.week} 周</span></div><h3>{course.name}</h3><p class="muted">{course.room || '未填写教室'}</p></li>{/each}</ul>{:else}<div class="empty"><h3>这一天没有课程</h3><p>课表已经保存，可以切换日期查看其他课程。</p></div>{/if}
  </section>
  <section><h2>提醒</h2><p>提前 {saved.reminderMinutes} 分钟提醒</p><p role="status">{snapshot?.reminderStatus}</p><details><summary>提醒权限与范围</summary><button disabled={busy} onclick={() => task(async () => { const permission = await requestPermission(); if (permission !== 'granted') throw new Error('通知权限未允许，请在系统设置中检查。'); notice = '已允许通知权限。'; })}>允许系统通知</button><p class="muted">每次最多安排最近 32 条未来提醒；启用插件后，需重新导入并保存课表以更新计划。{remaining > 0 ? `另有 ${remaining} 条尚未安排。` : ''}</p>{#if !snapshot?.mobile}<p class="muted">桌面提醒的支持情况以上方状态为准。支持后台调度的版本需保持主程序运行；退出时不提醒，重开不补发超过 5 分钟的过期提醒。</p>{/if}</details></section>
{:else if !busy && !error && !importing}<section class="empty"><h2>开始使用你的课表</h2><p>课表插件已就绪。导入一份课表 JSON，确认课程后即可保存和查看。</p><button class="primary" onclick={() => importing = true}>导入第一份课表</button></section>{/if}

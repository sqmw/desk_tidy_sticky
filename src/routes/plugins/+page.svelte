<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { emit, listen } from '@tauri-apps/api/event';
  import PluginManager from '$lib/plugins/PluginManager.svelte';
  import TimetablePage from '$lib/plugins/TimetablePage.svelte';
  import type { PluginSnapshot } from '$lib/plugins/types';
  import '$lib/plugins/product.css';
  let snapshot = $state<PluginSnapshot | null>(null), view = $state('manager'), error = $state('');
  let pendingImport = $state(false), working = $state(false), destination = $state('');
  function navigate(next: string) {
    if (next === view) return;
    if (view === 'timetable' && working) { error = '正在处理课表，请稍后再切换页面。'; return; }
    if (view === 'timetable' && pendingImport) { destination = next; return; }
    error = ''; view = next;
  }
  async function changed(value: PluginSnapshot) {
    snapshot = value;
    // Events are refresh hints, never an authority for installed/enabled state.
    try { await emit('plugins-changed'); } catch { /* Focus refresh is the fallback. */ }
  }
  onMount(() => {
    let alive = true;
    const requested = new URLSearchParams(location.search).get('view');
    const unlisten = listen<string>('plugins-navigate', async ({ payload }) => {
      try {
        const status = await invoke<PluginSnapshot>('plugin_status');
        if (!alive) return;
        snapshot = status; navigate(payload === 'timetable' && status.enabled ? 'timetable' : 'manager');
      } catch (e) { if (alive) error = String(e); }
    }).catch(() => () => {});
    void invoke<PluginSnapshot>('plugin_status').then(value => {
      if (!alive) return;
      snapshot = value; view = requested === 'timetable' && value.enabled ? 'timetable' : 'manager';
    }).catch(e => { if (alive) error = String(e); });
    return () => { alive = false; void unlisten.then(fn => fn()).catch(() => {}); };
  });
</script>

<svelte:head><title>{view === 'timetable' ? '课表' : '插件'} · Desk Tidy Sticky</title></svelte:head>
<main class="plugin-product">
  <nav aria-label="插件导航"><strong>DESK TIDY STICKY</strong><button class:active={view === 'manager'} aria-current={view === 'manager' ? 'page' : undefined} onclick={() => navigate('manager')}>插件管理</button>{#if snapshot?.manifest && snapshot.enabled}<button class:active={view === 'timetable'} aria-current={view === 'timetable' ? 'page' : undefined} onclick={() => navigate('timetable')}>课表</button>{/if}</nav>
  <div class="content">
    {#if error}<p role="alert" class="error">{error}</p>{/if}
    {#if destination}<div class="confirmation" role="alert"><p>当前导入尚未保存。离开会放弃本次导入，已保存课表不受影响。</p><div class="actions"><button onclick={() => { view = destination; destination = ''; error = ''; }}>放弃导入并离开</button><button onclick={() => destination = ''}>继续导入</button></div></div>{/if}
    {#if !snapshot && !error}<p role="status">正在加载插件…</p>{:else if snapshot}
      {#if view === 'timetable' && snapshot.enabled}<TimetablePage {changed} activity={(pending, busy) => { pendingImport = pending; working = busy; }}/>{:else}<PluginManager {snapshot} {changed} open={() => navigate('timetable')}/>{/if}
    {/if}
  </div>
</main>

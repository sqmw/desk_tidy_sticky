<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { emit, listen } from '@tauri-apps/api/event';
  import PluginManager from './PluginManager.svelte';
  import TimetablePage from './TimetablePage.svelte';
  import PluginDialog from './PluginDialog.svelte';
  import type { PluginSnapshot } from './types';
  import './product.css';
  let { view, navigate, availability }: { view: string; navigate: (target: string) => unknown; availability: (enabled: boolean) => void } = $props();
  let snapshot = $state<PluginSnapshot | null>(null), error = $state(''), visited = $state(false);
  let managerBusy = $state(false), timetableBusy = $state(false), importing = $state(false), confirming = $state(false);
  let timetable = $state<TimetablePage>();
  let alive = true;
  let decide: ((leave: boolean) => void) | null = null;
  $effect(() => { if (view === 'timetable') visited = true; });
  async function refresh() {
    const value = await invoke<PluginSnapshot>('plugin_status');
    if (!alive) return value;
    snapshot = value; availability(!!value.manifest && value.enabled);
    if (!value.enabled) { importing = false; timetableBusy = false; }
    return value;
  }
  async function changed(value: PluginSnapshot) {
    snapshot = value; availability(!!value.manifest && value.enabled);
    if (!value.enabled) { importing = false; timetableBusy = false; }
    try { await emit('plugins-changed'); } catch { /* Explicit opening refreshes state too. */ }
  }
  export async function resolveTarget(target: string) {
    if (target !== 'plugins' && target !== 'timetable') return target;
    const value = await refresh();
    if (target === 'timetable' && (!value.manifest || !value.enabled)) {
      error = '课表插件未安装或已停用，请先在这里安装或启用。'; return 'plugins';
    }
    error = ''; return target;
  }
  export async function canLeave() {
    if (managerBusy || timetableBusy) { error = '正在处理插件操作，请稍后再切换。'; return false; }
    if (!importing) return true;
    confirming = true;
    const leave = await new Promise<boolean>(resolve => { decide = resolve; });
    confirming = false; decide = null;
    if (leave) timetable?.discardImport();
    return leave;
  }
  onMount(() => {
    const update = () => { void refresh().catch(e => { if (alive) error = String(e); }); };
    const off = listen('plugins-changed', update).catch(() => () => {});
    update();
    return () => { alive = false; decide?.(false); void off.then(fn => fn()); };
  });
</script>

<div class="plugin-product embedded" hidden={view !== 'plugins' && view !== 'timetable'} inert={view !== 'plugins' && view !== 'timetable'}>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if !snapshot}<p role="status">正在加载插件…</p><button onclick={() => refresh().catch(e => error = String(e))}>重新读取</button>
  {:else}
    {#if view === 'plugins'}<PluginManager {snapshot} {changed} activity={(busy) => managerBusy = busy} open={() => navigate('timetable')}/>{/if}
    {#if visited && snapshot.enabled && snapshot.manifest}
      <div hidden={view !== 'timetable'} inert={view !== 'timetable'}><TimetablePage bind:this={timetable} {changed} activity={(pending, busy) => { importing = pending; timetableBusy = busy; }}/></div>
    {:else if view === 'timetable'}<p>课表插件未安装或已停用。</p><button onclick={() => navigate('plugins')}>返回插件管理</button>{/if}
  {/if}
  {#if confirming}<PluginDialog title="放弃本次导入？" cancel={() => decide?.(false)}><p>当前导入尚未保存。离开会放弃本次导入，已保存课表不受影响。</p><div class="actions"><button onclick={() => decide?.(false)}>继续导入</button><button onclick={() => decide?.(true)}>放弃导入并离开</button></div></PluginDialog>{/if}
</div>

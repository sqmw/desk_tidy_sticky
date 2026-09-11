<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { openPluginsWindow } from './open-window.js';
  import type { PluginSnapshot } from './types';
  let { collapsed = false } = $props();
  let available = $state(false), error = $state('');
  onMount(() => {
    let alive = true;
    const refresh = async () => {
      try { const s = await invoke<PluginSnapshot>('plugin_status'); if (alive) { available = !!s.manifest && s.enabled; error = ''; } }
      catch { if (alive) { available = false; error = '插件状态读取失败，请打开插件管理查看。'; } }
    };
    const stops = [listen('plugins-changed', refresh), listen('tauri://focus', refresh)].map(p => p.catch(() => () => {}));
    window.addEventListener('focus', refresh); void refresh();
    return () => { alive = false; window.removeEventListener('focus', refresh); for (const stop of stops) void stop.then(fn => fn()).catch(() => {}); };
  });
  async function open(view: string) { error = ''; try { await openPluginsWindow(view); } catch (e) { error = '无法打开插件：' + String(e); } }
</script>
<div class="links" class:collapsed>
  <button title="插件" aria-label="插件" onclick={() => open('manager')}><span aria-hidden="true">◇</span>{#if !collapsed}<span>插件</span>{/if}</button>
  {#if available}<button title="课表" aria-label="课表" onclick={() => open('timetable')}><span aria-hidden="true">▦</span>{#if !collapsed}<span>课表</span>{/if}</button>{/if}
  {#if error}<p role="alert">{error}</p>{/if}
</div>
<style>
  .links{display:grid;gap:4px;padding:6px 0}button{display:flex;align-items:center;gap:10px;width:100%;min-height:38px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;padding:8px 12px;cursor:pointer}button:hover{background:var(--ws-card-bg,#edf2f9)}button:focus-visible{outline:2px solid var(--ws-accent,#245bd5);outline-offset:2px}.collapsed button{justify-content:center}p{font-size:12px;line-height:1.5;color:#b34b44;margin:4px 8px;overflow-wrap:anywhere}
</style>

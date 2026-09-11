<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { PluginSnapshot } from './types';
  let { snapshot, changed, open }: { snapshot: PluginSnapshot; changed: (value: PluginSnapshot) => Promise<void>; open: () => void } = $props();
  let busy = $state(false), error = $state(''), notice = $state(''), raw = $state('');
  let candidate = $state<any>(null), consent = $state(false), confirm = $state('');
  async function task(work: () => Promise<void>) {
    if (busy) return;
    busy = true; error = ''; notice = '';
    try { await work(); } catch (e) { error = String(e instanceof Error ? e.message : e); }
    finally { busy = false; }
  }
  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    await task(async () => {
      candidate = null; consent = false; raw = '';
      if (file.size > 524288) throw new Error('插件包超过 512 KiB，请选择有效的 .dtplugin 文件。');
      raw = await file.text(); candidate = await invoke('plugin_preview', { raw });
    });
  }
  async function install() {
    await task(async () => {
      const value = await invoke<PluginSnapshot>('plugin_install', { raw, grants: consent ? ['storage', 'reminders'] : [] });
      await changed(value); candidate = null; raw = ''; consent = false;
      notice = '课表插件已安装，现在可以打开课表并导入课程。';
    });
  }
  async function lifecycle(action: string) {
    await task(async () => {
      await changed(await invoke<PluginSnapshot>('plugin_lifecycle', { action }));
      confirm = '';
      notice = action === 'uninstall' ? '插件已卸载，课表数据已保留。' : action === 'disable' ? '插件已停用，未来提醒已取消，课表数据保留。' : '插件已启用，可以打开课表。';
    });
  }
</script>

<header><p class="eyebrow">扩展你的工作台</p><h1>插件</h1><p class="muted">安装与管理功能扩展。课表的导入和使用在独立的课表页面中完成。</p></header>
{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if notice}<p class="success" role="status">{notice}</p>{/if}
{#if busy}<p role="status">正在处理…</p>{/if}
<section>
  <h2>已安装</h2>
  {#if snapshot.manifest}
    <div class="plugin-card"><div><h3>{snapshot.manifest.name} <small>v{snapshot.manifest.version}</small></h3><p class="muted">导入课表、查看每日课程并设置提前提醒。</p><span class="badge">{snapshot.enabled ? '已启用' : '已停用'}</span></div>
    <div class="actions"><button class="primary" disabled={busy || !snapshot.enabled} onclick={open}>打开课表</button><button disabled={busy} onclick={() => snapshot.enabled ? confirm = 'disable' : lifecycle('enable')}>{snapshot.enabled ? '停用' : '启用'}</button><button disabled={busy} onclick={() => confirm = 'uninstall'}>卸载</button></div></div>
    {#if confirm}<div class="confirmation"><h3>{confirm === 'uninstall' ? '卸载课表插件？' : '停用课表插件？'}</h3><p>未来提醒将被取消，已保存的课表数据会保留。{confirm === 'uninstall' ? '重新安装后可以恢复使用。' : '启用后可以恢复使用。'}</p><div class="actions"><button disabled={busy} onclick={() => lifecycle(confirm)}>确认{confirm === 'uninstall' ? '卸载' : '停用'}</button><button disabled={busy} onclick={() => confirm = ''}>取消</button></div></div>{/if}
  {:else}<div class="empty"><h3>还没有安装插件</h3><p>先选择课表插件包，确认权限后即可开始导入课程。</p></div>{/if}
</section>
<section><h2>从本地安装</h2><p class="muted">选择 .dtplugin 文件。当前版本仅开放经过审查的官方课表包，其他包和被修改的包会被拒绝。</p>
  <label class="file">选择插件包<input aria-label="选择插件包" type="file" accept=".dtplugin" disabled={busy} onchange={pick}/></label>
  {#if candidate}<div class="confirmation"><h3>安装 {candidate.name} · {candidate.version}</h3><p>申请的权限：</p><ul><li>独立存储：保存本插件的课表，不访问笔记数据。</li><li>系统提醒：安排与取消上课提醒，是否显示仍受系统权限影响。</li></ul><label class="consent"><input type="checkbox" disabled={busy} bind:checked={consent}/> 我同意以上权限</label><div class="actions"><button class="primary" disabled={busy || !consent} onclick={install}>确认安装</button><button disabled={busy} onclick={() => { candidate = null; raw = ''; consent = false; }}>取消安装</button></div></div>{/if}
</section>

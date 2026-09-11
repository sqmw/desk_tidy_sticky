<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  let { title, busy = false, cancel, children }: { title: string; busy?: boolean; cancel: () => void; children: Snippet } = $props();
  let element: HTMLDialogElement;
  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const controls = [...element.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]')].filter(node => node.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); element.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
  }
  onMount(() => { element.showModal(); return () => element.close(); });
</script>
<dialog bind:this={element} aria-label={title} tabindex="-1" onkeydown={trapFocus} oncancel={(event) => { event.preventDefault(); if (!busy) cancel(); }}>
  <h2>{title}</h2>
  {@render children()}
</dialog>
<style>
  dialog{width:min(480px,calc(100vw - 40px));max-height:calc(100dvh - 48px);overflow:auto;margin:auto;padding:24px;border:1px solid var(--ws-border,#bac7dc);border-radius:14px;background:var(--ws-card-bg,#fff);color:var(--ws-text,#202938);box-shadow:0 20px 70px #0004}dialog::backdrop{background:#10182766}h2{font-size:19px;margin:0 0 16px}
</style>

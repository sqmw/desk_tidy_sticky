<script>
  /** @type {{
   *   strings: Record<string, string>;
   *   status?: { state?: string; message?: string };
   *   onOpenDataDirectory?: () => void;
   * }} */
  let {
    strings,
    status = { state: "ready", message: "" },
    onOpenDataDirectory = /** @type {() => void} */ (() => {}),
  } = $props();

  const visible = $derived(status?.state === "recoveryRequired");
</script>

{#if visible}
  <section class="recovery-notice" role="alert" aria-live="assertive">
    <div>
      <strong>{strings.notesStorageRecoveryTitle}</strong>
      <p>{strings.notesStorageRecoveryBody}</p>
    </div>
    <button type="button" onclick={onOpenDataDirectory}>{strings.openNotesDataDirectory}</button>
  </section>
{/if}

<style>
  .recovery-notice {
    position: fixed;
    inset: 16px;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    border: 1px solid #c2410c;
    border-radius: 8px;
    background: #fff7ed;
    color: #7c2d12;
    box-shadow: 0 16px 40px rgba(124, 45, 18, 0.2);
  }

  strong {
    display: block;
    font-size: 14px;
  }

  p {
    margin: 5px 0 0;
    font-size: 13px;
    line-height: 1.45;
  }

  button {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 11px;
    border: 1px solid #9a3412;
    border-radius: 5px;
    background: #9a3412;
    color: #fff;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid #1d4ed8;
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    .recovery-notice {
      align-items: stretch;
      flex-direction: column;
    }

    button {
      width: 100%;
    }
  }
</style>

<script>
  let {
    strings,
    showEditDialog = $bindable(),
    editText = $bindable(),
    submitEdit,
  } = $props();
</script>

{#if showEditDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="dialog-backdrop"
    role="button"
    tabindex="-1"
    onclick={() => (showEditDialog = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="dialog" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <h3>{strings.edit}</h3>
      <textarea bind:value={editText} rows="4"></textarea>
      <div class="dialog-actions">
        <button type="button" onclick={() => (showEditDialog = false)}>{strings.cancel}</button>
        <button type="button" class="primary" onclick={submitEdit}>{strings.saveNote}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    min-width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .dialog h3 {
    margin: 0 0 16px;
    font-size: 16px;
  }

  .dialog textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--divider);
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
    resize: vertical;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .dialog-actions button {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--divider);
    cursor: pointer;
    font-size: 14px;
  }

  .dialog-actions button.primary {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }
</style>

<script>
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api/core";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { page } from "$app/stores";

    let note = $state(null);
    let noteId = $page.params.id;
    let text = $state("");

    // Load note data on mount
    async function loadNote() {
        try {
            const allNotes = await invoke("load_notes", { sortMode: "custom" });
            // @ts-ignore
            const n = allNotes.find((n) => n.id === noteId);
            if (n) {
                note = n;
                text = n.text;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function save() {
        if (!note) return;
        try {
            await invoke("update_note_text", {
                // @ts-ignore
                id: note.id,
                text: text,
                sortMode: "custom",
            });
        } catch (e) {
            console.error(e);
        }
    }

    // Debounce save
    /** @type {any} */
    let timeout;
    function handleInput() {
        clearTimeout(timeout);
        timeout = setTimeout(save, 500);
    }

    async function pinToDesktop() {
        try {
            await invoke("pin_window_to_desktop");
        } catch (e) {
            console.error(e);
        }
    }

    async function unpinFromDesktop() {
        try {
            await invoke("unpin_window_from_desktop");
        } catch (e) {
            console.error(e);
        }
    }

    onMount(() => {
        loadNote();
        // Setup listeners for sync?
    });
</script>

<div class="note-window" data-tauri-drag-region>
    {#if note}
        <textarea
            bind:value={text}
            oninput={handleInput}
            class="editor"
            spellcheck="false"
        ></textarea>

        <div class="toolbar">
            <button onclick={pinToDesktop} title="Pin to Desktop">📌</button>
            <button onclick={unpinFromDesktop} title="Unpin">📍</button>
            <button onclick={() => getCurrentWindow().close()} title="Close"
                >✕</button
            >
        </div>
    {:else}
        <div class="loading">Loading...</div>
    {/if}
</div>

<style>
    :global(body) {
        margin: 0;
        overflow: hidden;
        background: transparent;
    }

    .note-window {
        width: 100vw;
        height: 100vh;
        background: #fff9c4; /* Classic sticky note yellow */
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .editor {
        flex: 1;
        background: transparent;
        border: none;
        resize: none;
        padding: 16px;
        font-family: "Segoe UI", sans-serif;
        font-size: 16px;
        outline: none;
    }

    .toolbar {
        height: 32px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 0 8px;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .note-window:hover .toolbar {
        opacity: 1;
    }

    button {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 4px;
        opacity: 0.6;
    }

    button:hover {
        opacity: 1;
    }
</style>

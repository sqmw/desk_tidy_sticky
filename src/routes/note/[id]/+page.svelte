<script>
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api/core";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { listen } from "@tauri-apps/api/event";
    import { page } from "$app/stores";

    /** @type {any} */
    let note = $state(null);
    const noteId = $derived($page.params.id);
    let text = $state("");
    let clickThrough = $state(false);

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

    async function applyZOrderAndParent() {
        if (!note) return;

        const win = getCurrentWindow();
        try {
            if (note.isAlwaysOnTop) {
                await invoke("unpin_window_from_desktop");
                await win.setAlwaysOnTop(true);
            } else {
                await win.setAlwaysOnTop(false);
                await invoke("pin_window_to_desktop");
            }
        } catch (e) {
            console.error("applyZOrderAndParent", e);
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

    async function toggleMouseInteraction() {
        clickThrough = !clickThrough;
        try {
            await getCurrentWindow().setIgnoreCursorEvents(clickThrough);
        } catch (e) {
            console.error("setIgnoreCursorEvents", e);
        }
    }

    async function toggleTopmost() {
        if (!note) return;
        try {
            const all = await invoke("toggle_z_order", {
                // @ts-ignore
                id: note.id,
                sortMode: "custom",
            });
            // @ts-ignore
            const updated = all.find((n) => n.id === noteId);
            if (updated) note = updated;
            await applyZOrderAndParent();
        } catch (e) {
            console.error("toggleTopmost", e);
        }
    }

    onMount(() => {
        /** @type {Array<Promise<() => void>>} */
        const unlistenPromises = [];

        unlistenPromises.push(
            listen("overlay_input_changed", async (event) => {
                // @ts-ignore
                clickThrough = !!event.payload;
                try {
                    await getCurrentWindow().setIgnoreCursorEvents(clickThrough);
                } catch (e) {
                    console.error("overlay_input_changed", e);
                }
            }),
        );

        loadNote().then(applyZOrderAndParent);

        return async () => {
            for (const p of unlistenPromises) {
                try {
                    const unlisten = await p;
                    unlisten();
                } catch {
                    // ignore
                }
            }
        };
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
            <button onclick={toggleTopmost} title="Toggle z-order">
                {note.isAlwaysOnTop ? "⬇" : "⬆"}
            </button>
            <button onclick={toggleMouseInteraction} title="Toggle mouse interaction">
                {clickThrough ? "🖱️✖" : "🖱️"}
            </button>
            <button onclick={pinToDesktop} title="Attach to desktop layer">📌</button>
            <button onclick={unpinFromDesktop} title="Detach from desktop layer">📍</button>
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

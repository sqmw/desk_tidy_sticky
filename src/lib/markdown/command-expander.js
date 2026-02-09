import {
  builtinLineCommandHandlers,
  builtinTextCommandHandlers,
} from "$lib/markdown/commands/builtin-commands.js";

/** @type {Array<(text: string, ctx: { now: Date }) => string>} */
const textCommandHandlers = [...builtinTextCommandHandlers];
/** @type {Array<(line: string, ctx: { now: Date }) => string | string[] | null>} */
const lineCommandHandlers = [...builtinLineCommandHandlers];

/**
 * Register a custom text-level command handler.
 * @param {(text: string, ctx: { now: Date }) => string} handler
 */
export function registerNoteTextCommand(handler) {
  textCommandHandlers.push(handler);
}

/**
 * Register a custom line-level command handler.
 * @param {(line: string, ctx: { now: Date }) => string | string[] | null} handler
 */
export function registerNoteLineCommand(handler) {
  lineCommandHandlers.push(handler);
}

/**
 * @param {string} text
 * @param {Date} [now]
 */
export function expandNoteCommands(text, now = new Date()) {
  const ctx = { now };
  let expanded = String(text ?? "");
  for (const handler of textCommandHandlers) {
    expanded = handler(expanded, ctx);
  }

  const lines = expanded.replaceAll("\r\n", "\n").split("\n");
  /** @type {string[]} */
  const output = [];
  for (const line of lines) {
    let transformed = null;
    for (const handler of lineCommandHandlers) {
      const next = handler(line, ctx);
      if (next !== null) {
        transformed = next;
        break;
      }
    }
    if (Array.isArray(transformed)) {
      output.push(...transformed);
    } else if (typeof transformed === "string") {
      output.push(transformed);
    } else {
      output.push(line);
    }
  }
  return output.join("\n");
}

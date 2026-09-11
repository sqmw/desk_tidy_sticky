/**
 * Plugin messages are JSON contracts, never framework proxies or native objects.
 * @param {unknown} value
 * @returns {any}
 */
export function encodePluginMessage(value) {
  const text = JSON.stringify(value);
  if (text === undefined) throw new Error('插件请求不是有效 JSON');
  if (new TextEncoder().encode(text).length > 1024 * 1024) {
    throw new Error('插件请求超过 1 MiB');
  }
  return JSON.parse(text);
}

<script lang="ts">
  import { onMount } from 'svelte';
  let { busy, preview, error, initialRaw = '', onPreview, onSave, onCancel }: {
    busy: boolean; preview: any; error: string;
    initialRaw?: string;
    onPreview: (raw: string) => Promise<void>; onSave: () => void; onCancel: () => void;
  } = $props();
  let raw = $state(''), fileName = $state(''), localError = $state('');
  let alive = true;
  onMount(() => { raw = initialRaw; return () => { alive = false; }; });
  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    localError = '';
    try {
      if (file.size > 262144) throw new Error('课表超过 256 KiB，请选择较小的 JSON 文件。');
      const contents = await file.text();
      if (!alive) return;
      raw = contents; fileName = file.name; await onPreview(raw);
    } catch (e) { localError = String(e instanceof Error ? e.message : e); }
  }
</script>

<section aria-label="导入课表">
  <h2>{preview ? '确认导入' : '导入课表'}</h2>
  <p class="muted">支持 Desk Tidy 课表 JSON v1 / v2（v2需插件0.2.0）。先预览，再确认替换；未确认前不会改变已保存课表。其他学校文件需先转换为本规范。</p>
  {#if localError || error}<p class="error" role="alert">{localError || error}</p>{/if}
  {#if preview}
    <p class="success">校验通过 · {preview.courses.length} 门课程 · {preview.semester.weeks} 周 · 尚未保存</p>
    <p>显示范围从 {preview.semester.startDate} 开始 · {preview.semester.timeZone} · {preview.schemaVersion===2 ? (preview.reminders.enabled?'提醒已申请启用':'提醒关闭') : `提前 ${preview.reminderMinutes} 分钟提醒`}</p>
    {#if preview.schemaVersion===2}
      <p class="muted">{preview.sections.length} 个班级 · {preview.meetings.length} 个上课时段 · {preview.meetings.filter((m:any)=>m.time.status!=='confirmed').length} 个时间未确认。教师为空及同格多教师均保留，不会补造。</p>
      <div class="table-scroll"><table><caption>即将导入的全部授课记录</caption><thead><tr><th>课程 / 班级</th><th>日期 / 节次</th><th>教师</th><th>教室</th></tr></thead><tbody>{#each preview.meetings as meeting (meeting.id)}<tr><td>{preview.sections.find((s:any)=>s.id===meeting.sectionId)?.name}</td><td>{meeting.date}<br/>{meeting.time.periodIds.join('、') || '未确定'}{meeting.time.status!=='confirmed'?'（参考）':''}</td><td>{meeting.teachers.map((name:any)=>name || '未注明').join('、')}</td><td>{meeting.room || '未填写'}</td></tr>{/each}</tbody></table></div>
    {:else}
    <div class="table-scroll"><table><caption>即将导入的全部课程</caption><thead><tr><th>课程</th><th>星期 / 节次</th><th>周次</th><th>教室</th></tr></thead><tbody>{#each preview.courses as course (course.id)}<tr><td>{course.name}</td><td>周{weekdays[course.weekday - 1]} · {course.periodIds.join('、')}</td><td>{course.weeks.join('、')}</td><td>{course.room || '未填写'}</td></tr>{/each}</tbody></table></div>
    {/if}
    {#if !preview.courses.length}<p>这是一份空课表，确认后将替换掉原有课程。</p>{/if}
    <div class="actions"><button class="primary" disabled={busy} onclick={onSave}>{busy ? '正在保存…' : '确认导入并保存'}</button><button disabled={busy} onclick={onCancel}>取消导入</button></div>
  {:else}
    <label class="file">选择课表 JSON<input aria-label="导入课表JSON" type="file" accept=".json,application/json" disabled={busy} onchange={pick}/></label>
    {#if fileName}<p class="muted">已选择：{fileName}</p>{/if}
    <details><summary>高级：粘贴或编辑 JSON</summary><label class="editor">课表 JSON<textarea aria-label="课表JSON编辑器" spellcheck="false" rows="10" bind:value={raw} disabled={busy}></textarea></label><button disabled={busy || !raw.trim()} onclick={() => { localError = ''; void onPreview(raw); }}>校验并预览</button></details>
    <button disabled={busy} onclick={onCancel}>取消导入</button>
  {/if}
</section>

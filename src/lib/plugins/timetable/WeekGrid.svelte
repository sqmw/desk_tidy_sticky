<script lang="ts">
  import { layoutCourses, shortDate } from './week-layout.js';
  import PluginDialog from '../PluginDialog.svelte';
  let { dates, periods, rows, today }: { dates: string[]; periods: any[]; rows: any[]; today: string } = $props();
  let selected = $state<any>(null);
  const names = ['周一','周二','周三','周四','周五','周六','周日'];
  const columns = $derived(dates.map(date => layoutCourses(rows.filter(course => course.date === date), periods)));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Focusable scroll region enables keyboard scrolling in narrow windows.) -->
<div class="week-scroll" tabindex="0" role="region" aria-label="周课表，窄窗口可横向滚动">
  <div class="week-grid" style={`--slots:${periods.length};--slot-height:clamp(60px,calc((100dvh - 265px) / ${periods.length}),92px)`}>
    <div class="time-column"><div class="corner">时间</div>{#each periods as period, i}<div class="period"><b>{String(i+1).padStart(2,'0')}</b><span>{period.start}</span><span>{period.end}</span></div>{/each}</div>
    {#each dates as date, dayIndex}
      <div class="day-column" class:today={date === today} class:weekend={dayIndex > 4}>
        <div class="day-heading"><span>{names[dayIndex]}{#if date === today}<em>今天</em>{/if}</span><strong>{shortDate(date)}</strong></div>
        <div class="day-track">
          {#each periods as _, i}<div class="grid-cell" style={`grid-row:${i+1};grid-column:1/-1`} aria-hidden="true"></div>{/each}
          {#each columns[dayIndex] as course (course.id)}
            <button class={`course color-${course.color}`} style={`grid-row:${course.row}/span ${course.span};grid-column:1;margin-left:calc(${course.lane / course.lanes * 100}% + 4px);width:calc(${100 / course.lanes}% - 8px)`} onclick={() => selected=course} aria-label={`${course.name}，${names[dayIndex]} ${course.start}–${course.end}，${course.room || '未填写教室'}`} title={`${course.name} · ${course.start}–${course.end} · ${course.room || '未填写教室'}`}>
              <strong>{course.name}</strong><span>{course.room || '未填写教室'}</span>{#if course.span>1}<small>{course.start}–{course.end}</small>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
{#if selected}<PluginDialog title={selected.name} cancel={() => selected=null}><div class="course-detail"><p><span>上课日期</span><strong>{selected.date.replaceAll('-','.')} · 第 {selected.week} 周</strong></p><p><span>时间</span><strong>{selected.start}–{selected.end}</strong></p><p><span>教室</span><strong>{selected.room || '未填写教室'}</strong></p></div><button onclick={() => selected=null}>关闭详情</button></PluginDialog>{/if}

<style>
  .week-scroll{overflow:auto;border:1px solid var(--ws-border,#dce2ed);border-radius:14px;background:var(--ws-card-bg,#fff)}
  .week-scroll:focus-visible{outline:2px solid var(--ws-accent,#2563eb);outline-offset:3px}
  .week-grid{display:grid;grid-template-columns:56px repeat(7,minmax(80px,1fr));min-width:620px}
  .time-column{position:sticky;left:0;z-index:2;background:var(--ws-card-bg,#fff)}
  .corner,.day-heading{height:70px;box-sizing:border-box;border-bottom:1px solid var(--ws-border,#dce2ed);display:flex;flex-direction:column;justify-content:center;gap:4px}
  .corner{font-size:11px;text-align:center;color:var(--ws-muted,#71809b);letter-spacing:.08em}
  .day-heading{padding:10px 12px}.day-heading>span{display:flex;gap:6px;align-items:center;font-size:11px;color:var(--ws-muted,#71809b)}.day-heading strong{font-size:14px;font-weight:600;color:var(--ws-text,#344054)}
  .day-heading em{font-size:9px;font-style:normal;padding:1px 5px;border-radius:4px;background:var(--ws-accent,#2563eb);color:#fff}
  .day-column{border-left:1px solid var(--ws-border-soft,#e9edf4);min-width:0}.weekend{background:color-mix(in srgb,var(--ws-muted,#71809b) 3%,transparent)}
  .today{background:color-mix(in srgb,var(--ws-accent,#2563eb) 3%,transparent)}.today .day-heading strong{color:var(--ws-accent,#2563eb)}
  .day-track{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(var(--slots),var(--slot-height));position:relative}
  .period{height:var(--slot-height);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px solid var(--ws-border-soft,#e9edf4);font-size:10px;line-height:1.5;color:var(--ws-muted,#71809b)}.period b{font-size:12px;font-weight:600;margin-bottom:4px;color:var(--ws-text,#344054)}
  .grid-cell{border-bottom:1px solid var(--ws-border-soft,#e9edf4);pointer-events:none;min-width:0}
  :global(.plugin-product) .week-grid .course{--course-tone:#6366d8;--course-ink:var(--ws-text-strong,#26334d);z-index:1;align-self:stretch;min-width:0;min-height:0;margin:5px 4px;padding:9px 8px;border:0;border-left:3px solid color-mix(in srgb,var(--course-tone) 75%,var(--ws-card-bg,#fff));border-radius:7px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;background:color-mix(in srgb,var(--course-tone) 13%,var(--ws-card-bg,#fff));color:var(--course-ink);box-shadow:none;overflow:hidden;transition:background .15s,box-shadow .15s}
  :global(.plugin-product) .week-grid .course:hover{background:color-mix(in srgb,var(--course-tone) 22%,var(--ws-card-bg,#fff));box-shadow:0 3px 10px #0000000c}
  :global(.plugin-product) .week-grid .color-1{--course-tone:#2b9986}:global(.plugin-product) .week-grid .color-2{--course-tone:#d18a3c}:global(.plugin-product) .week-grid .color-3{--course-tone:#c66e99}:global(.plugin-product) .week-grid .color-4{--course-tone:#528fc7}
  .course strong{font-size:12px;line-height:1.4;font-weight:650;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.course span{font-size:10px;line-height:1.4;overflow-wrap:anywhere;opacity:.78}.course small{font-size:9px;color:inherit;opacity:.68;margin-top:auto}
  .course-detail{margin:0 0 20px}.course-detail p{display:flex;justify-content:space-between;gap:18px;padding:10px 0;border-bottom:1px solid var(--ws-border,#dce2ed);font-size:13px}.course-detail span{color:var(--ws-muted,#71809b)}.course-detail strong{font-weight:500}
</style>

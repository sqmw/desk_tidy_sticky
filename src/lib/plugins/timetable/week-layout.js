const DAY = 86400000;
/** Calendar-only arithmetic; no local timezone or DST shifts. @param {string} date @param {number} days */
export function addDays(date, days) { return new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10); }
/** @param {{startDate:string,weeks:number}} semester @param {string} today */
export function currentWeek(semester, today) {
  const week = Math.floor((Date.parse(today + 'T00:00:00Z') - Date.parse(semester.startDate + 'T00:00:00Z')) / (7 * DAY)) + 1;
  return { week: Math.max(1, Math.min(semester.weeks, week)), outside: week < 1 ? '学期尚未开始' : week > semester.weeks ? '学期已结束' : '' };
}
/** @param {string} start @param {number} week */
export function weekDays(start, week) { return Array.from({length:7}, (_, i) => addDays(start, (week - 1) * 7 + i)); }
/** @param {string} date */
export function shortDate(date) { const [,m,d] = date.split('-'); return `${Number(m)}月${Number(d)}日`; }
/** Stable course color even when occurrences change week. @param {string} id */
export function courseColor(id) { let hash=0; for(const c of id.split('/').slice(0,-1).join('/')) hash=(hash*31+c.charCodeAt(0))>>>0;return hash%5; }

/** Place already-computed plugin occurrences, not another course rule engine.
 * Conflicting courses get adjacent lanes instead of covering one another.
 * @param {any[]} rows @param {{start:string,end:string}[]} periods
 */
export function layoutCourses(rows, periods) {
  const items=rows.map(course=>{
    const start=periods.findIndex(p=>p.start===course.start), end=periods.findIndex(p=>p.end===course.end);
    if(start<0||end<start)throw new Error('课程时间与节次不一致，请重新导入课表。');
    return {...course,row:start+1,span:end-start+1,lane:0,lanes:1,color:courseColor(course.id)};
  }).sort((a,b)=>a.row-b.row||b.span-a.span||a.id.localeCompare(b.id));
  let group=/** @type {any[]} */([]), ends=/** @type {number[]} */([]), boundary=0;
  function flush(){for(const item of group)item.lanes=ends.length;group=[];ends=[];}
  for(const item of items){
    if(group.length&&item.row>=boundary)flush();
    let lane=ends.findIndex(end=>end<=item.row);if(lane<0)lane=ends.length;
    item.lane=lane;ends[lane]=item.row+item.span;boundary=Math.max(...ends);group.push(item);
  }
  flush();return items;
}

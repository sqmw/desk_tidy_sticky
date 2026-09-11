// Desk Tidy timetable v0.1: browser-compatible business logic, no native imports.
import { parseV2, occurrencesV2 } from './schema-v2.js';
/** @param {string} message */
const fail = (message) => { throw new Error(message); };
/** @param {any} value */
const id = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(value);
/** @param {any} value @param {number} low @param {number} high */
const int = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
/** @param {any} value */
const minute = (value) => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) fail('节次时间必须为 HH:mm');
  const [h,m] = value.split(':').map(Number);
  if (!int(h,0,23) || !int(m,0,59)) fail('节次时间无效');
  return h*60+m;
};
/** @param {any} value */
const date = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('日期必须为 YYYY-MM-DD');
  const t = Date.parse(value+'T00:00:00Z');
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0,10)!==value) fail('日期无效');
  return t;
};
/** @param {any[]} values @param {string} label */
function unique(values, label) { if(new Set(values).size!==values.length) fail(label+'重复'); }
/** @param {any} value @param {number} max @param {string} label @returns {any[]} */
function list(value, max, label) { if(!Array.isArray(value)||value.length>max) fail(label+'数量无效'); return value; }

/** @param {string} input */
export function parse(input) {
  if(typeof input!=='string' || new TextEncoder().encode(input).length>262144) fail('课表文件超过256 KiB或格式无效');
  const t=JSON.parse(input);
  if(t?.schemaVersion===2)return parseV2(t);
  if(!t || t.schemaVersion!==1 || !id(t.id)) fail('课表版本或ID无效');
  const s=t.semester;
  if(!s || !int(s.weeks,1,54) || !['Asia/Shanghai','UTC'].includes(s.timeZone)) fail('学期周数或时区无效（v0.1支持Asia/Shanghai、UTC）');
  if(new Date(date(s.startDate)).getUTCDay()!==1) fail('学期开始日必须是第一周的星期一');
  if(!int(t.reminderMinutes,0,120)) fail('提前提醒必须为0–120分钟');
  const periods=list(t.periods,24,'节次');
  if(!periods.length) fail('至少定义一个节次');
  for(const p of periods) if(!p || !id(p.id) || minute(p.start)>=minute(p.end)) fail('节次ID或时间范围无效');
  unique(periods.map(p=>p.id),'节次ID');
  const sorted=[...periods].sort((a,b)=>minute(a.start)-minute(b.start));
  for(let i=1;i<sorted.length;i++) if(minute(sorted[i-1].end)>minute(sorted[i].start)) fail('节次不能重叠');
  const courses=list(t.courses,128,'课程');
  unique(courses.map(c=>c?.id),'课程ID');
  for(const c of courses) {
    if(!c || !id(c.id) || typeof c.name!=='string' || !c.name.trim() || c.name.length>80 || /[\u0000-\u001f]/.test(c.name)) fail('课程ID或名称无效');
    if(!int(c.weekday,1,7) || typeof c.room!=='string' || c.room.length>120) fail('课程星期或教室无效');
    const weeks=list(c.weeks,54,'课程周次'); unique(c.weeks,'课程周次');
    if(!c.weeks.length || weeks.some(w=>!int(w,1,s.weeks))) fail('课程周次超出学期');
    const periodIds=list(c.periodIds,24,'课程节次');unique(c.periodIds,'课程节次');
    const indices=periodIds.map(p=>sorted.findIndex(v=>v.id===p)).sort((a,b)=>a-b);
    if(!indices.length || indices[0]<0 || indices.some((n,i)=>i>0&&n!==indices[i-1]+1)) fail('课程引用的节次必须存在且连续');
  }
  // Return only the versioned contract; never forward incidental caller fields.
  return {schemaVersion:1,id:t.id,semester:{startDate:s.startDate,timeZone:s.timeZone,weeks:s.weeks},
    reminderMinutes:t.reminderMinutes,periods:sorted.map(p=>({id:p.id,start:p.start,end:p.end})),
    courses:courses.map(c=>({id:c.id,name:c.name.trim(),room:c.room,weekday:c.weekday,weeks:[...c.weeks].sort((a,b)=>a-b),periodIds:[...c.periodIds]}))};
}

/** @param {any} input */
export function occurrences(input) {
  if(input?.schemaVersion===2)return occurrencesV2(input);
  const t=parse(JSON.stringify(input));
  const offset=t.semester.timeZone==='Asia/Shanghai'?480:0;
  const base=date(t.semester.startDate), result=[];
  for(const c of t.courses) {
    const ps=t.periods.filter((/** @type {any} */ p)=>c.periodIds.includes(p.id));
    for(const week of c.weeks) {
      const day=base+((week-1)*7+c.weekday-1)*86400000;
      result.push({id:`${t.id}/${c.id}/${week}`,name:c.name,room:c.room,week,date:new Date(day).toISOString().slice(0,10),
        start:ps[0].start,end:ps[ps.length-1].end,at:day+(minute(ps[0].start)-offset)*60000});
    }
  }
  return result.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
/** @param {any} input @param {string} day */
export function view(input,day) { date(day);return occurrences(input).filter((/** @type {any} */ e)=>e.date===day); }
/** @param {any} input @param {number} now */
export function plan(input,now) {
  if(!Number.isFinite(now))fail('当前时间无效');
  if(input?.schemaVersion===2){
    const t=parseV2(input);
    if(!t.reminders.enabled||t.mode==='demo')return {events:[],remaining:0};
    if(t.meetings.some((/** @type {any} */ m)=>m.time.status!=='confirmed'))fail('存在未确认授课时间，不能安排提醒');
    const events=occurrencesV2(t).map((/** @type {any} */ e)=>({at:e.at-t.reminders.minutesBefore*60000,title:'该上课了：'+e.name,body:e.room+' · '+e.start})).filter((/** @type {any} */ e)=>e.at>now+1000);
    return {events:events.slice(0,32),remaining:Math.max(0,events.length-32)};
  }
  const all=occurrences(input).map((/** @type {any} */ e)=>({at:e.at-input.reminderMinutes*60000,title:'该上课了：'+e.name,body:e.room+' · '+e.start})).filter((/** @type {any} */ e)=>e.at>now+1000);
  return {events:all.slice(0,32),remaining:Math.max(0,all.length-32)};
}

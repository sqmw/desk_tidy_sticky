import schema from './schema-v2.json' with { type: 'json' };

/** Validator for the bounded JSON Schema vocabulary used by schema-v2.json.
 * @param {any} value @param {any} rule @param {string} path
 */
function validateShape(value, rule, path) {
  if(rule.$ref) rule=schema.$defs.sourceRef;
  const fail=(/** @type {string} */ message)=>{throw new Error(`${path}: ${message}`);};
  if('const' in rule&&value!==rule.const)fail('版本不支持');
  if(rule.enum&&!rule.enum.includes(value))fail('值不在允许范围内');
  const kind=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(rule.type){const types=Array.isArray(rule.type)?rule.type:[rule.type];if(!types.includes(kind)&&!(types.includes('integer')&&Number.isInteger(value)))fail('类型不正确');}
  if(kind==='string'){
    if(value.length<(rule.minLength??0)||value.length>(rule.maxLength??Infinity))fail('文本长度无效');
    if(rule.pattern&&!new RegExp(rule.pattern).test(value))fail('格式不正确');
  }
  if(kind==='number'&&(!Number.isFinite(value)||value<(rule.minimum??-Infinity)||value>(rule.maximum??Infinity)))fail('数值超出范围');
  if(kind==='array'){
    if(value.length<(rule.minItems??0)||value.length>(rule.maxItems??Infinity))fail('数量超出范围');
    value.forEach((/** @type {any} */ item,/** @type {number} */ i)=>validateShape(item,rule.items,`${path}[${i}]`));
  }
  if(kind==='object'){
    for(const key of rule.required??[])if(!Object.hasOwn(value,key))fail(`缺少 ${key}`);
    for(const [key,item] of Object.entries(value)){
      if(!Object.hasOwn(rule.properties??{},key)){if(rule.additionalProperties===false)fail(`未知字段 ${key}`);}
      else validateShape(item,rule.properties[key],`${path}.${key}`);
    }
  }
}
/** @param {string} value */
function calendarDate(value){const n=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw new Error('日期无效：'+value);return n;}
/** @param {string} value */
function clockMinute(value){const [h,m]=value.split(':').map(Number);if(h>23||m>59)throw new Error('节次时间无效');return h*60+m;}
/** @param {any[]} values @param {string} label */
function ids(values,label){const result=new Set(values.map(v=>v.id));if(result.size!==values.length)throw new Error(label+' ID重复');return result;}

/** Validate and retain the complete v2 contract; never downgrade to v1. @param {any} input */
export function parseV2(input){
  validateShape(input,schema,'课表');
  const t=JSON.parse(JSON.stringify(input));
  const base=calendarDate(t.semester.startDate),end=base+t.semester.weeks*7*86400000;
  if(new Date(base).getUTCDay()!==1)throw new Error('显示周起点必须是星期一');
  if(t.mode==='demo'&&t.reminders.enabled)throw new Error('demo禁止启用系统提醒');
  const courseIds=ids(t.courses,'课程'),sectionIds=ids(t.sections,'班级'),sourceIds=ids(t.sources,'来源');
  ids(t.meetings,'授课');ids(t.periods,'节次');
  for(const p of t.periods)if(!sourceIds.has(p.source.sourceId))throw new Error('节次作息来源不存在');
  t.periods.sort((/** @type {any} */ a,/** @type {any} */ b)=>clockMinute(a.start)-clockMinute(b.start));
  t.periods.forEach((/** @type {any} */ p,/** @type {number} */ i)=>{if(clockMinute(p.start)>=clockMinute(p.end)||(i&&clockMinute(t.periods[i-1].end)>clockMinute(p.start)))throw new Error('节次范围无效或重叠');});
  for(const s of t.sections)if(!courseIds.has(s.courseId))throw new Error('班级引用未知课程');
  const occupied=new Set();
  for(const m of t.meetings){
    const date=calendarDate(m.date);if(date<base||date>=end)throw new Error('授课日期超出显示范围');
    if(!sectionIds.has(m.sectionId))throw new Error('授课引用未知班级');
    if(!sourceIds.has(m.source.sourceId)||!sourceIds.has(m.time.source.sourceId))throw new Error('授课来源不存在');
    const ps=m.time.periodIds.map((/** @type {string} */ id)=>t.periods.findIndex((/** @type {any} */ p)=>p.id===id)).sort((/** @type {number} */ a,/** @type {number} */ b)=>a-b);
    if(ps.some((/** @type {number} */ n,/** @type {number} */ i)=>n<0||(i&&n!==ps[i-1]+1)))throw new Error('授课节次必须有效且连续');
    if(m.time.status==='unknown'?ps.length!==0:ps.length===0)throw new Error('节次确定性与节次列表不一致');
    const key=JSON.stringify([m.sectionId,m.date,m.dayPart,ps]);if(occupied.has(key))throw new Error('同班同一时段重复，请合并教师记录');occupied.add(key);
    m.time.periodIds=ps.map((/** @type {number} */ i)=>t.periods[i].id);
  }
  return t;
}

/** @param {any} input */
export function occurrencesV2(input){
  const t=parseV2(input),base=calendarDate(t.semester.startDate),offset=t.semester.timeZone==='Asia/Shanghai'?480:0;
  return t.meetings.map((/** @type {any} */ m)=>{
    const section=t.sections.find((/** @type {any} */ s)=>s.id===m.sectionId),course=t.courses.find((/** @type {any} */ c)=>c.id===section.courseId);
    const periods=t.periods.filter((/** @type {any} */ p)=>m.time.periodIds.includes(p.id));
    const start=periods[0]?.start??null,end=periods.at(-1)?.end??null;
    const week=Math.floor((calendarDate(m.date)-base)/604800000)+1;
    return {id:`${t.id}/${m.id}`,courseId:course.id,sectionId:section.id,name:course.name,sectionName:section.name,room:m.room,teachers:m.teachers,notes:m.notes,timeStatus:m.time.status,dayPart:m.dayPart,
      date:m.date,week,weekLabel:t.semester.weekNumberStart===null?`显示周 ${week}`:`第 ${week+t.semester.weekNumberStart-1} 周`,start,end,at:start?calendarDate(m.date)+(clockMinute(start)-offset)*60000:null};
  }).sort((/** @type {any} */ a,/** @type {any} */ b)=>a.date.localeCompare(b.date)||(a.at??0)-(b.at??0)||a.id.localeCompare(b.id));
}

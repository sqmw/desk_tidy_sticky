// @ts-nocheck -- Node test harness, matching the existing frontend test convention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse,occurrences,view,plan } from '../../plugins/timetable-v01/entry.js';
const example=readFileSync(new URL('../../plugins/timetable-v01/example.json',import.meta.url),'utf8');
test('timetable validates semester, odd weeks, contiguous periods and timezone',()=>{
 const t=parse(example),events=occurrences(t);
 assert.equal(events.length,9);assert.equal(events[0].date,'2026-09-07');assert.equal(events[1].date,'2026-09-21');
 assert.equal(new Date(events[0].at).toISOString(),'2026-09-07T00:00:00.000Z');
 assert.equal(view(t,'2026-09-07')[0].end,'09:40');assert.equal(view(t,'2026-09-14').length,0);
 assert.equal(plan(t,Date.parse('2026-09-06T00:00Z')).events[0].at,events[0].at-600000);
});
test('bad timetable is rejected without partially normalizing caller data',()=>{
 /** @type {Array<(t:any)=>void>} */
 const mutations=[t=>t.courses[0].weeks.push(1),t=>t.courses[0].weeks.push(19),t=>t.courses[0].periodIds.push('missing'),t=>t.semester.startDate='2026-02-30',t=>t.semester.startDate='2026-09-08',t=>t.periods[0].start='25:00',t=>t.reminderMinutes=-1];
 for(const mutate of mutations){
  const t=JSON.parse(example);mutate(t);const before=JSON.stringify(t);assert.throws(()=>parse(before));assert.equal(JSON.stringify(t),before);
 }
});
test('repeat import is stable and reminders have a disclosed bounded plan',()=>{
 const t=parse(example);assert.deepEqual(parse(JSON.stringify(t)),t);
 t.courses[0].weeks=Array.from({length:18},(_,i)=>i+1);
 t.courses.push({...t.courses[0],id:'second',weekday:2});
 const p=plan(t,Date.parse('2026-09-06T00:00Z'));assert.equal(p.events.length,32);assert.equal(p.remaining,4);
 t.courses=[];assert.deepEqual(plan(t,Date.now()),{events:[],remaining:0});
});

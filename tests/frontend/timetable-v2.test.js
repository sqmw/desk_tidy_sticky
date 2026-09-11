// @ts-nocheck
import test from 'node:test';import assert from 'node:assert/strict';
import {realDemo} from './helpers/real-timetable-v1.js';
import {parse,occurrences,view,plan} from '../../plugins/timetable-v01/entry.js';
test('real demo retains 15 classes, 82 slots and 87 teacher entries with no reminders',()=>{
 const t=parse(JSON.stringify(realDemo));assert.equal(t.courses.length,15);assert.equal(t.sections.length,15);assert.equal(t.meetings.length,82);
 assert.equal(t.meetings.reduce((n,m)=>n+m.teachers.length,0),87);assert.equal(occurrences(t).length,82);
 assert.equal(t.meetings.filter(m=>m.teachers.length===2).length,5);assert.equal(t.meetings.filter(m=>m.teachers.includes(null)).length,1);
 assert.equal(view(t,'2026-09-14')[0].room,'逸夫楼阶7');assert.equal(view(t,'2026-09-21')[0].teachers.length,2);
 assert.deepEqual(plan(t,0),{events:[],remaining:0});assert.deepEqual(parse(JSON.stringify(t)),t);
});
test('v2 rejects duplicate identities, dangling references, invalid dates and ambiguous reminders',()=>{
 const mutations=[t=>t.courses.push(t.courses[0]),t=>t.meetings[0].sectionId='missing',t=>t.meetings[0].date='2026-02-30',t=>t.meetings[0].time.periodIds=['p999'],t=>t.meetings[0].source.sourceId='missing',t=>t.meetings.push({...t.meetings[0],id:'duplicate'}),t=>t.reminders.enabled=true,t=>t.extra='lost'];
 for(const mutate of mutations){const t=structuredClone(realDemo);mutate(t);assert.throws(()=>parse(JSON.stringify(t)));}
 assert.throws(()=>parse(JSON.stringify({...realDemo,constructor:'unknown'})),/未知字段/);
 const personal=structuredClone(realDemo);personal.mode='personal';personal.reminders.enabled=true;assert.throws(()=>plan(personal,0),/未确认/);
});
test('confirmed personal times can schedule; unknown time remains representable',()=>{
 const t=structuredClone(realDemo);t.mode='personal';t.reminders.enabled=true;for(const m of t.meetings)m.time.status='confirmed';
 const p=plan(t,0);assert.equal(p.events.length,32);assert.equal(p.remaining,50);
 t.reminders.enabled=false;t.meetings[0].time.status='unknown';t.meetings[0].time.periodIds=[];
 assert.equal(occurrences(parse(JSON.stringify(t))).find(e=>e.id.endsWith(t.meetings[0].id)).at,null);
});

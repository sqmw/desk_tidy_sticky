// @ts-nocheck -- Pure compatibility checks use real course data, not UI demo fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,occurrences,view,plan} from '../../plugins/timetable-v01/entry.js';
import {legacyTestTimetable} from './helpers/real-timetable-v1.js';
test('v1 compatibility retains explicit real dates, period references and timezone',()=>{
 const t=parse(JSON.stringify(legacyTestTimetable())),events=occurrences(t);
 assert.equal(events.length,82);assert.equal(events[0].date,'2026-09-14');
 assert.equal(new Date(events[0].at).toISOString(),'2026-09-14T06:00:00.000Z');
 assert.equal(view(t,'2026-09-14')[0].end,'17:10');assert.equal(view(t,'2026-09-15').length,0);
 assert.equal(plan(t,Date.parse('2026-09-13T00:00Z')).events[0].at,events[0].at-600000);
});
test('bad legacy data is rejected without partially normalizing caller data',()=>{
 const mutations=[t=>t.courses[0].weeks.push(t.courses[0].weeks[0]),t=>t.courses[0].weeks.push(99),t=>t.courses[0].periodIds.push('missing'),t=>t.semester.startDate='2026-02-30',t=>t.semester.startDate='2026-09-15',t=>t.periods[0].start='25:00',t=>t.reminderMinutes=-1];
 for(const mutate of mutations){const t=legacyTestTimetable();mutate(t);const before=JSON.stringify(t);assert.throws(()=>parse(before));assert.equal(JSON.stringify(t),before);}
});
test('legacy repeat import is stable and plans remain bounded',()=>{
 const t=parse(JSON.stringify(legacyTestTimetable()));assert.deepEqual(parse(JSON.stringify(t)),t);
 const p=plan(t,Date.parse('2026-09-13T00:00Z'));assert.equal(p.events.length,32);assert.equal(p.remaining,50);
 t.courses=[];assert.deepEqual(plan(t,Date.now()),{events:[],remaining:0});
});

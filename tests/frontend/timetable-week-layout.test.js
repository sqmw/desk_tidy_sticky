// @ts-nocheck -- Node harness; production JS remains type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { currentWeek, weekDays, layoutCourses, courseColor } from '../../src/lib/plugins/timetable/week-layout.js';
import { parse, view } from '../../plugins/timetable-v01/entry.js';
import fs from 'node:fs';
const example=parse(fs.readFileSync(new URL('../../plugins/timetable-v01/example.json',import.meta.url),'utf8'));

test('week navigation clamps outside semester and uses calendar dates across years',()=>{
  assert.deepEqual(currentWeek(example.semester,'2026-09-11'),{week:1,outside:''});
  assert.equal(currentWeek(example.semester,'2026-09-14').week,2);
  assert.equal(currentWeek(example.semester,'2026-09-01').outside,'学期尚未开始');
  assert.equal(currentWeek(example.semester,'2027-08-01').week,18);
  assert.deepEqual(weekDays('2026-12-28',1),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
});
test('plugin remains authority for odd weeks; layout only maps time to rows',()=>{
  const first=layoutCourses(view(example,'2026-09-07'),example.periods);
  assert.equal(first[0].row,1);assert.equal(first[0].span,2);
  assert.equal(view(example,'2026-09-14').length,0);
  assert.equal(courseColor('table/course/1'),courseColor('table/course/3'));
  assert.throws(()=>layoutCourses([{id:'bad',start:'07:00',end:'08:00'}],example.periods),/节次不一致/);
});
test('overlapping courses get separate lanes, isolated courses use full width',()=>{
  const periods=[{start:'08:00',end:'08:45'},{start:'09:00',end:'09:45'},{start:'10:00',end:'10:45'}];
  const rows=layoutCourses([{id:'t/a/1',start:'08:00',end:'09:45'},{id:'t/b/1',start:'09:00',end:'09:45'},{id:'t/c/1',start:'10:00',end:'10:45'}],periods);
  assert.equal(rows[0].lanes,2);assert.equal(rows[1].lanes,2);assert.notEqual(rows[0].lane,rows[1].lane);assert.equal(rows[2].lanes,1);
});

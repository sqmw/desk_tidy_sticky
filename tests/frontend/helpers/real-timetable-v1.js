// @ts-nocheck -- A compatibility-test projection only; never export or schedule it.
import fs from 'node:fs';
export const realDemo=JSON.parse(fs.readFileSync(new URL('../../../plugins/timetable-v01/example.json',import.meta.url),'utf8'));
export function legacyTestTimetable(){
 return {schemaVersion:1,id:realDemo.id,semester:{startDate:realDemo.semester.startDate,weeks:realDemo.semester.weeks,timeZone:realDemo.semester.timeZone},reminderMinutes:10,periods:structuredClone(realDemo.periods),courses:realDemo.meetings.map(m=>{
  const section=realDemo.sections.find(s=>s.id===m.sectionId),course=realDemo.courses.find(c=>c.id===section.courseId);
  const d=new Date(m.date+'T00:00:00Z');return{id:m.id,name:course.name,room:m.room,weekday:d.getUTCDay()||7,weeks:[Math.floor((d.getTime()-Date.parse(realDemo.semester.startDate+'T00:00:00Z'))/604800000)+1],periodIds:[...m.time.periodIds]};
 })};
}

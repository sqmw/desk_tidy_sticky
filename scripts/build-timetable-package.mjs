import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../plugins/timetable-v01/',import.meta.url);
const source=await readFile(new URL('entry.js',root),'utf8');
const raw=JSON.stringify({format:1,manifest:{id:'org.desktidy.timetable',name:'课表',version:'0.1.0',hostApi:1,permissions:['storage','reminders']},source});
await writeFile(new URL('timetable.dtplugin',root),raw+'\n');
await writeFile(new URL('package.sha256',root),createHash('sha256').update(raw+'\n').digest('hex')+'\n');
console.log('Built reviewed timetable package and host digest. Rebuild host after intentionally approving source changes.');

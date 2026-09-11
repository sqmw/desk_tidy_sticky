import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emitTo } from '@tauri-apps/api/event';
export async function openPluginsWindow(view = 'manager') {
  view = view === 'timetable' ? 'timetable' : 'manager';
  const current=await WebviewWindow.getByLabel('plugins');
  if(current){await emitTo('plugins','plugins-navigate',view);await current.show();await current.setFocus();return;}
  return new Promise((resolve,reject)=>{
    const window=new WebviewWindow('plugins',{url:'/plugins?view='+view,title:'Desk Tidy Sticky · 插件',width:980,height:760,minWidth:360,minHeight:500,decorations:true});
    window.once('tauri://created',()=>resolve(undefined));window.once('tauri://error',event=>reject(new Error(String(event.payload))));
  });
}

import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
export async function openPluginsWindow() {
  const current=await WebviewWindow.getByLabel('plugins');
  if(current){await current.show();await current.setFocus();return;}
  return new Promise((resolve,reject)=>{
    const window=new WebviewWindow('plugins',{url:'/plugins',title:'Desk Tidy Sticky · 插件',width:900,height:720,minWidth:360,minHeight:500,decorations:true});
    window.once('tauri://created',()=>resolve(undefined));window.once('tauri://error',event=>reject(new Error(String(event.payload))));
  });
}

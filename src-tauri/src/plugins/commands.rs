use super::{
    installed::State,
    notifications::{self, Reminder},
    package,
};
use serde::Serialize;
use serde_json::Value;
use std::{path::PathBuf, sync::Mutex};
use tauri::Manager;
static LOCK: Mutex<()> = Mutex::new(());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Snapshot {
    manifest: Option<package::Manifest>,
    enabled: bool,
    revision: u64,
    data: Option<Value>,
    reminder_status: String,
    mobile: bool,
}
fn path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins-v01/state.json"))
}
fn caller(window: &tauri::WebviewWindow) -> Result<(), String> {
    if ["main", "workspace", "plugins"].contains(&window.label()) {
        Ok(())
    } else {
        Err("该窗口无插件管理权限".into())
    }
}
fn snapshot(s: State) -> Result<Snapshot, String> {
    Ok(Snapshot {
        manifest: s
            .package
            .as_deref()
            .map(package::verify)
            .transpose()?
            .map(|p| p.manifest),
        enabled: s.enabled,
        revision: s.revision,
        data: s.data,
        reminder_status: s.reminder_status,
        mobile: cfg!(mobile),
    })
}

#[tauri::command]
pub(crate) async fn plugin_preview(
    window: tauri::WebviewWindow,
    raw: String,
) -> Result<package::Manifest, String> {
    caller(&window)?;
    Ok(package::verify(&raw)?.manifest)
}
#[tauri::command]
pub(crate) async fn plugin_status(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<Snapshot, String> {
    caller(&window)?;
    let _g = LOCK.lock().map_err(|_| "插件服务锁损坏")?;
    snapshot(State::read(&path(&app)?)?)
}
#[tauri::command]
pub(crate) async fn plugin_install(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    raw: String,
    grants: Vec<String>,
) -> Result<Snapshot, String> {
    caller(&window)?;
    package::verify(&raw)?;
    if grants != ["storage", "reminders"] {
        return Err("必须明确同意课表存储与提醒权限".into());
    }
    let _g = LOCK.lock().map_err(|_| "插件服务锁损坏")?;
    let path = path(&app)?;
    let mut s = State::read(&path)?;
    notifications::cancel(&app, &s.notification_ids)?;
    s.notification_ids.clear();
    s.package = Some(raw);
    s.enabled = true;
    s.reminder_status = "已安装，请打开课表".into();
    s.write(&path)?;
    snapshot(s)
}
#[tauri::command]
pub(crate) async fn plugin_open(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<String, String> {
    caller(&window)?;
    let _g = LOCK.lock().map_err(|_| "插件服务锁损坏")?;
    let s = State::read(&path(&app)?)?;
    if !s.enabled {
        return Err("插件未启用".into());
    }
    Ok(package::verify(s.package.as_deref().ok_or("插件未安装")?)?.source)
}
#[tauri::command]
pub(crate) async fn plugin_lifecycle(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    action: String,
) -> Result<Snapshot, String> {
    caller(&window)?;
    let _g = LOCK.lock().map_err(|_| "插件服务锁损坏")?;
    let path = path(&app)?;
    let mut s = State::read(&path)?;
    if !["enable", "disable", "uninstall"].contains(&action.as_str()) {
        return Err("未知插件操作".into());
    }
    if action == "enable" {
        package::verify(s.package.as_deref().ok_or("插件未安装")?)?;
        s.enabled = true;
    } else {
        notifications::cancel(&app, &s.notification_ids)?;
        s.notification_ids.clear();
        s.enabled = false;
        if action == "uninstall" {
            s.package = None;
        }
    }
    s.reminder_status = "状态已更新；打开课表时重建计划".into();
    s.write(&path)?;
    snapshot(s)
}
#[tauri::command]
pub(crate) async fn plugin_save(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    expected_revision: u64,
    data: Value,
    plan: Vec<Reminder>,
) -> Result<Snapshot, String> {
    caller(&window)?;
    if data.to_string().len() > 262144 {
        return Err("课表数据超过256 KiB".into());
    }
    notifications::validate(&plan)?;
    let _g = LOCK.lock().map_err(|_| "插件服务锁损坏")?;
    let path = path(&app)?;
    let mut s = State::read(&path)?;
    if !s.enabled || s.package.is_none() || s.revision != expected_revision {
        return Err("插件状态已变化，请重新打开后操作".into());
    }
    notifications::cancel(&app, &s.notification_ids)?;
    s.data = Some(data);
    s.notification_ids = (0..plan.len()).map(|i| 910000 + i as i32).collect();
    s.reminder_status = "课程已保存，提醒尚待确认".into();
    s.write(&path)?;
    s.reminder_status = match notifications::apply(&app, &plan) {
        Ok(status) => status,
        Err(e) => {
            let cleanup = notifications::cancel(&app, &s.notification_ids);
            if cleanup.is_ok() {
                s.notification_ids.clear();
            }
            format!(
                "提醒未生效：{e}；撤销结果：{}",
                if cleanup.is_ok() {
                    "已撤销"
                } else {
                    "待恢复"
                }
            )
        }
    };
    s.write(&path)?;
    snapshot(s)
}

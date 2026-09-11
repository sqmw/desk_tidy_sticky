use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Reminder {
    pub at: i64,
    pub title: String,
    pub body: String,
}
pub(crate) fn validate(plan: &[Reminder]) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp_millis();
    if plan.len() > 32
        || plan.iter().any(|r| {
            r.at <= now
                || r.at > now + 366 * 86400000_i64
                || r.title.is_empty()
                || r.title.chars().count() > 120
                || r.body.len() > 512
        })
    {
        return Err("提醒计划无效或超过32条".into());
    }
    Ok(())
}
#[cfg(mobile)]
pub(crate) fn cancel(app: &tauri::AppHandle, ids: &[i32]) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    if !ids.is_empty() {
        app.notification()
            .cancel(ids.to_vec())
            .map_err(|e| e.to_string())?;
        app.notification()
            .remove_active(ids.to_vec())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[cfg(desktop)]
pub(crate) fn cancel(_app: &tauri::AppHandle, _ids: &[i32]) -> Result<(), String> {
    Ok(())
}
#[cfg(mobile)]
pub(crate) fn apply(app: &tauri::AppHandle, plan: &[Reminder]) -> Result<String, String> {
    use tauri_plugin_notification::NotificationExt;
    if plan.is_empty() {
        return Ok("没有未来提醒".into());
    }
    if app
        .notification()
        .permission_state()
        .map_err(|e| e.to_string())?
        != tauri::plugin::PermissionState::Granted
    {
        return Err("通知权限未允许；课程已保存，但提醒未生效".into());
    }
    for (i, r) in plan.iter().enumerate() {
        let at = chrono::DateTime::from_timestamp_millis(r.at).ok_or("提醒时间无效")?;
        let schedule=serde_json::from_value(serde_json::json!({"at":{"date":at.to_rfc3339(),"repeating":false,"allowWhileIdle":true}})).map_err(|e|e.to_string())?;
        app.notification()
            .builder()
            .id(910000 + i as i32)
            .title(&r.title)
            .body(&r.body)
            .schedule(schedule)
            .show()
            .map_err(|e| e.to_string())?;
    }
    Ok(format!(
        "已向系统提交{}条提醒；Android未授权精确定时可能延后",
        plan.len()
    ))
}
#[cfg(desktop)]
pub(crate) fn apply(_app: &tauri::AppHandle, plan: &[Reminder]) -> Result<String, String> {
    Ok(if plan.is_empty() {
        "没有未来提醒"
    } else {
        "课程已保存；当前桌面版尚未接入系统定时提醒"
    }
    .into())
}

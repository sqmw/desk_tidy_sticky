use super::{atomic_file::write_bytes_atomically, package};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, io::Read, path::Path};

#[derive(Default, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct State {
    pub schema: u32,
    pub revision: u64,
    pub package: Option<String>,
    pub enabled: bool,
    pub data: Option<Value>,
    pub notification_ids: Vec<i32>,
    pub reminder_status: String,
}
impl State {
    pub fn empty() -> Self {
        Self {
            schema: 1,
            reminder_status: "尚未安排提醒".into(),
            ..Self::default()
        }
    }
    pub fn read(path: &Path) -> Result<Self, String> {
        let f = match fs::File::open(path) {
            Ok(f) => f,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Self::empty()),
            Err(e) => return Err(e.to_string()),
        };
        let mut bytes = Vec::new();
        f.take(1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if bytes.len() > 1024 * 1024 {
            return Err("插件状态过大，已阻止覆盖".into());
        }
        let s: Self = serde_json::from_slice(&bytes).map_err(|_| "插件状态损坏，已阻止覆盖")?;
        if s.schema != 1
            || s.notification_ids.len() > 32
            || s.notification_ids
                .iter()
                .any(|id| !(910000..910032).contains(id))
            || (s.enabled && s.package.is_none())
        {
            return Err("插件状态无效，已阻止覆盖".into());
        }
        if let Some(raw) = &s.package {
            package::verify(raw)?;
        }
        if s.data
            .as_ref()
            .map(|d| d.to_string().len() > 262144)
            .unwrap_or(false)
        {
            return Err("插件数据过大，已阻止覆盖".into());
        }
        Ok(s)
    }
    pub fn write(&mut self, path: &Path) -> Result<(), String> {
        self.revision = self.revision.checked_add(1).ok_or("插件状态版本溢出")?;
        write_bytes_atomically(path, &serde_json::to_vec(self).map_err(|e| e.to_string())?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lifecycle_data_is_separate_and_corrupt_state_is_not_replaced() {
        let root = std::env::temp_dir().join(format!("desk-tidy-plugin-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("state.json");
        let mut state = State::empty();
        state.data = Some(serde_json::json!({"course":"kept"}));
        state.write(&path).unwrap();
        let restored = State::read(&path).unwrap();
        assert_eq!(restored.data, state.data);
        assert_eq!(restored.revision, 1);
        assert!(restored.package.is_none());
        fs::write(&path, b"{").unwrap();
        assert!(State::read(&path).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"{");
    }
}

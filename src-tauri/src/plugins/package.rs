use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Manifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub host_api: u32,
    pub permissions: Vec<String>,
}
#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Package {
    pub format: u32,
    pub manifest: Manifest,
    pub source: String,
}

pub(crate) fn verify(raw: &str) -> Result<Package, String> {
    if raw.len() > 512 * 1024 {
        return Err("插件包超过512 KiB".into());
    }
    let digest = format!("{:x}", Sha256::digest(raw.as_bytes()));
    if digest != include_str!("../../../plugins/timetable-v01/package.sha256").trim()
        && digest != "7d83868fd884d3f4f4a0c9916da2f067c9f21c09fb1249e8d40909cbc81ddbef" {
        return Err("当前仅允许经过审查的官方课表包；未知或被修改的包不会执行".into());
    }
    let p: Package = serde_json::from_str(raw).map_err(|_| "插件包格式无效")?;
    if p.format != 1
        || p.manifest.host_api != 1
        || p.manifest.id != "org.desktidy.timetable"
        || p.manifest.permissions != ["storage", "reminders"]
        || p.source.len() > 65536
    {
        return Err("插件包合同不兼容".into());
    }
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;
    const OFFICIAL: &str = include_str!("../../../plugins/timetable-v01/timetable.dtplugin");
    #[test]
    fn only_exact_reviewed_package_is_allowed() {
        assert_eq!(verify(OFFICIAL).unwrap().manifest.version, "0.2.0");
        assert_eq!(verify(include_str!("../../../plugins/timetable-v01/timetable-0.1.0.dtplugin")).unwrap().manifest.version, "0.1.0");
        assert!(verify(&OFFICIAL.replace("browser-compatible", "tampered")).is_err());
        assert!(verify(&(OFFICIAL.to_owned() + " ")).is_err());
        assert!(
            verify(&OFFICIAL.replace("org.desktidy.timetable", "org.attacker.timetable")).is_err()
        );
        assert!(verify(&"x".repeat(512 * 1024 + 1)).is_err());
    }
}

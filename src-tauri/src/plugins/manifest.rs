use serde::Deserialize;
use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(super) enum Platform {
    Macos,
    Windows,
    Android,
    Ios,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
pub(super) enum Capability {
    #[serde(rename = "storage")]
    Storage,
    #[serde(rename = "reminders")]
    Reminders,
    #[serde(rename = "notes.read")]
    NotesRead,
    #[serde(rename = "notes.write")]
    NotesWrite,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Permissions {
    pub required: Vec<Capability>,
    pub optional: Vec<Capability>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Manifest {
    pub manifest_version: u32,
    pub host_api: u32,
    pub id: String,
    pub name: String,
    pub version: String,
    pub data_version: u32,
    pub entry: String,
    pub platforms: Vec<Platform>,
    pub permissions: Permissions,
}

// Private wrapper prevents admission of an unvalidated deserialized Manifest.
#[derive(Debug)]
pub(super) struct ValidatedManifest(Manifest);

impl ValidatedManifest {
    pub fn get(&self) -> &Manifest {
        &self.0
    }

    pub fn parse(bytes: &[u8]) -> Result<Self, &'static str> {
        if bytes.len() > 16 * 1024 {
            return Err("manifest_too_large");
        }
        let m: Manifest = serde_json::from_slice(bytes).map_err(|_| "invalid_manifest")?;
        if m.manifest_version != 1 || m.host_api != 1 {
            return Err("unsupported_version");
        }
        let parts: Vec<_> = m.id.split('.').collect();
        if m.id.len() > 128
            || parts.len() < 2
            || parts.iter().any(|p| {
                p.is_empty()
                    || !p.as_bytes()[0].is_ascii_lowercase()
                    || !p.as_bytes()[p.len() - 1].is_ascii_alphanumeric()
                    || !p
                        .bytes()
                        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
            })
        {
            return Err("invalid_id");
        }
        if m.name.trim().is_empty()
            || m.name.chars().count() > 80
            || m.name.chars().any(char::is_control)
        {
            return Err("invalid_name");
        }
        let version: Vec<_> = m.version.split('.').collect();
        if version.len() != 3
            || version.iter().any(|p| {
                p.is_empty()
                    || (p.len() > 1 && p.starts_with('0'))
                    || !p.bytes().all(|b| b.is_ascii_digit())
                    || p.parse::<u32>().is_err()
            })
            || m.data_version == 0
        {
            return Err("invalid_version");
        }
        if !valid_entry(&m.entry) {
            return Err("invalid_entry");
        }
        let mut platforms = HashSet::new();
        if m.platforms.is_empty() || m.platforms.iter().any(|p| !platforms.insert(p)) {
            return Err("invalid_platforms");
        }
        let mut capabilities = HashSet::new();
        if m.permissions
            .required
            .iter()
            .chain(&m.permissions.optional)
            .any(|c| !capabilities.insert(c))
        {
            return Err("duplicate_permission");
        }
        Ok(Self(m))
    }
}

fn valid_entry(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= 240
        && path.ends_with(".js")
        && path.split('/').all(|part| {
            let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
            let reserved = matches!(
                stem.as_str(),
                "CON"
                    | "PRN"
                    | "AUX"
                    | "NUL"
                    | "COM1"
                    | "COM2"
                    | "COM3"
                    | "COM4"
                    | "COM5"
                    | "COM6"
                    | "COM7"
                    | "COM8"
                    | "COM9"
                    | "LPT1"
                    | "LPT2"
                    | "LPT3"
                    | "LPT4"
                    | "LPT5"
                    | "LPT6"
                    | "LPT7"
                    | "LPT8"
                    | "LPT9"
            );
            !part.is_empty()
                && part != "."
                && part != ".."
                && !part.ends_with('.')
                && !reserved
                && part
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.'))
        })
}

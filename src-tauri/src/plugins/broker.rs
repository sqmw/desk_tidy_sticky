//! Host-only session broker. The transport owns Session; plugin JSON never does.
//! Memory storage is a bounded validation adapter, not product persistence.
use super::{
    admission::{assess, AdmissionContext},
    manifest::{Capability, ValidatedManifest},
};
use serde::Deserialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

#[derive(Clone)]
pub(super) struct Session(Uuid);

struct Binding {
    plugin_id: String,
    granted: HashSet<Capability>,
}

#[derive(Debug, PartialEq, Eq)]
pub(super) enum Error {
    Admission,
    Revoked,
    Permission,
    InvalidRequest,
    Quota,
}

#[derive(Deserialize)]
#[serde(tag = "method", deny_unknown_fields)]
enum Request {
    #[serde(rename = "storage.get")]
    Get { key: String },
    #[serde(rename = "storage.set")]
    Set { key: String, value: Value },
    #[serde(rename = "storage.delete")]
    Delete { key: String },
}

/// Host-owned limits, shared across sessions of a plugin, never supplied in requests.
pub(super) struct Limits {
    pub request_bytes: usize,
    pub storage_bytes: usize,
    pub storage_keys: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            request_bytes: 64 * 1024,
            storage_bytes: 256 * 1024,
            storage_keys: 256,
        }
    }
}

pub(super) struct Broker {
    sessions: HashMap<Uuid, Binding>,
    data: HashMap<String, HashMap<String, Value>>,
    limits: Limits,
}

impl Broker {
    pub fn new(limits: Limits) -> Self {
        Self {
            sessions: HashMap::new(),
            data: HashMap::new(),
            limits,
        }
    }

    /// Caller must authenticate the installed package's ownership before this call.
    /// Same ID is NOT proof of authorship. Restart invalidates old transport handles.
    pub fn start(
        &mut self,
        manifest: &ValidatedManifest,
        context: &AdmissionContext,
    ) -> Result<Session, Error> {
        let admission = assess(manifest, context).map_err(|_| Error::Admission)?;
        let id = &manifest.get().id;
        self.stop(id);
        let token = Uuid::new_v4();
        self.sessions.insert(
            token,
            Binding {
                plugin_id: id.clone(),
                granted: admission.granted,
            },
        );
        Ok(Session(token))
    }

    /// All lifecycle/consent/policy changes revoke old sessions before re-admission.
    /// A stopped plugin's data survives; this method never deletes business data.
    pub fn stop(&mut self, plugin_id: &str) {
        self.sessions
            .retain(|_, binding| binding.plugin_id != plugin_id);
    }

    /// Consent/platform/channel changes fail closed, unlike a failed candidate
    /// installation. Even failed re-admission must invalidate all old grants.
    pub fn reauthorize(
        &mut self,
        manifest: &ValidatedManifest,
        context: &AdmissionContext,
    ) -> Result<Session, Error> {
        self.stop(&manifest.get().id);
        self.start(manifest, context)
    }

    /// &mut self serializes checks with mutation/revocation. The native integration
    /// must keep a single broker behind a lock; never release it across a write.
    pub fn call(&mut self, session: &Session, bytes: &[u8]) -> Result<Value, Error> {
        let binding = self.sessions.get(&session.0).ok_or(Error::Revoked)?;
        if !binding.granted.contains(&Capability::Storage) {
            return Err(Error::Permission);
        }
        if bytes.len() > self.limits.request_bytes {
            return Err(Error::Quota);
        }
        let request: Request = serde_json::from_slice(bytes).map_err(|_| Error::InvalidRequest)?;
        let key = match &request {
            Request::Get { key } | Request::Set { key, .. } | Request::Delete { key } => key,
        };
        // Keys are logical names, never paths. No Unicode/path normalization ambiguity.
        if key.is_empty()
            || key.len() > 128
            || !key
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
        {
            return Err(Error::InvalidRequest);
        }
        let data = self.data.entry(binding.plugin_id.clone()).or_default();
        match request {
            Request::Get { key } => {
                Ok(serde_json::json!({"found": data.contains_key(&key), "value": data.get(&key)}))
            }
            Request::Delete { key } => {
                Ok(serde_json::json!({"deleted": data.remove(&key).is_some()}))
            }
            Request::Set { key, value } => {
                if !data.contains_key(&key) && data.len() >= self.limits.storage_keys {
                    return Err(Error::Quota);
                }
                let mut total = key.len() + value.to_string().len();
                for (other_key, other_value) in
                    data.iter().filter(|(other_key, _)| **other_key != key)
                {
                    total = total
                        .checked_add(other_key.len() + other_value.to_string().len())
                        .ok_or(Error::Quota)?;
                }
                if total > self.limits.storage_bytes {
                    return Err(Error::Quota);
                }
                data.insert(key, value);
                Ok(Value::Null)
            }
        }
    }
}

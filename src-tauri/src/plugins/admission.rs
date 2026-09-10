use super::manifest::{Capability, Platform, ValidatedManifest};
use std::collections::HashSet;

/// Construct only from trusted host state, never from a plugin request.
pub(super) struct AdmissionContext {
    pub platform: Platform,
    pub implemented: HashSet<Capability>,
    pub channel_allowed: HashSet<Capability>,
    pub user_granted: HashSet<Capability>,
}

#[derive(Debug, PartialEq, Eq)]
pub(super) enum Denial {
    Unimplemented,
    Channel,
    Consent,
}

#[derive(Debug, PartialEq, Eq)]
pub(super) struct Unavailable {
    pub capability: Capability,
    pub reason: Denial,
}

#[derive(Debug)]
pub(super) struct Admission {
    pub granted: HashSet<Capability>,
    pub optional_unavailable: Vec<Unavailable>,
}

#[derive(Debug, PartialEq, Eq)]
pub(super) enum Rejection {
    Platform,
    Required(Vec<Unavailable>),
}

/// Snapshot for enable-time UX; not a session token or authorization for later IPC.
pub(super) fn assess(
    manifest: &ValidatedManifest,
    context: &AdmissionContext,
) -> Result<Admission, Rejection> {
    let m = manifest.get();
    if !m.platforms.contains(&context.platform) {
        return Err(Rejection::Platform);
    }
    let missing = |capability: &Capability| {
        let reason = if !context.implemented.contains(capability) {
            Some(Denial::Unimplemented)
        } else if !context.channel_allowed.contains(capability) {
            Some(Denial::Channel)
        } else if !context.user_granted.contains(capability) {
            Some(Denial::Consent)
        } else {
            None
        };
        reason.map(|reason| Unavailable {
            capability: *capability,
            reason,
        })
    };
    let required: Vec<_> = m.permissions.required.iter().filter_map(&missing).collect();
    if !required.is_empty() {
        return Err(Rejection::Required(required));
    }
    let optional_unavailable: Vec<_> = m.permissions.optional.iter().filter_map(&missing).collect();
    let granted = m
        .permissions
        .required
        .iter()
        .chain(&m.permissions.optional)
        .filter(|c| missing(c).is_none())
        .copied()
        .collect();
    Ok(Admission {
        granted,
        optional_unavailable,
    })
}

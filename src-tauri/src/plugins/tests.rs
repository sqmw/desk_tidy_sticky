use super::{admission::*, manifest::*};
use serde_json::{json, Value};

const FIXTURE: &[u8] = include_bytes!("../../../tests/fixtures/plugins/manifest.json");
fn changed(key: &str, value: Value) -> Result<ValidatedManifest, &'static str> {
    let mut m: Value = serde_json::from_slice(FIXTURE).unwrap();
    m[key] = value;
    ValidatedManifest::parse(&serde_json::to_vec(&m).unwrap())
}
fn context() -> AdmissionContext {
    let all = [
        Capability::Storage,
        Capability::Reminders,
        Capability::NotesRead,
    ]
    .into_iter()
    .collect();
    AdmissionContext {
        platform: Platform::Android,
        implemented: all,
        channel_allowed: [Capability::Storage, Capability::Reminders]
            .into_iter()
            .collect(),
        user_granted: [Capability::Storage].into_iter().collect(),
    }
}

#[test]
fn external_manifest_parses_without_executing_entry() {
    let m = ValidatedManifest::parse(FIXTURE).unwrap();
    assert_eq!(m.get().id, "org.example.timetable");
    assert_eq!(m.get().entry, "dist/main.js");
}

#[test]
fn malformed_unknown_duplicate_and_oversized_json_rejected() {
    for bytes in [b"{".to_vec(), vec![b' '; 16385], b"\xff".to_vec()] {
        assert!(ValidatedManifest::parse(&bytes).is_err());
    }
    assert!(changed("unexpected", json!(true)).is_err());
    let source = String::from_utf8(FIXTURE.to_vec())
        .unwrap()
        .replacen("{", "{\"hostApi\":1,", 1);
    assert!(ValidatedManifest::parse(source.as_bytes()).is_err());
}

#[test]
fn versions_ids_names_and_platforms_are_strict() {
    for (key, value) in [
        ("manifestVersion", json!(2)),
        ("hostApi", json!(0)),
        ("hostApi", json!("1")),
        ("version", json!("01.0.0")),
        ("version", json!("1.0.0-beta")),
        ("dataVersion", json!(0)),
        ("id", json!("../notes")),
        ("id", json!("org.Example")),
        ("id", json!("org.a-")),
        ("name", json!("  ")),
        ("name", json!("a\nb")),
        ("platforms", json!([])),
        ("platforms", json!(["android", "android"])),
        ("platforms", json!(["unknown"])),
    ] {
        assert!(changed(key, value.clone()).is_err(), "{key}: {value}");
    }
}

#[test]
fn entry_rejects_path_escape_and_cross_platform_ambiguity() {
    for path in [
        "../evil.js",
        "/evil.js",
        "a/../../evil.js",
        "a\\evil.js",
        "https://x/a.js",
        "a//b.js",
        "a/./b.js",
        "%2e%2e/b.js",
        "CON.js",
        "a./b.js",
        "a\0.js",
        "a.html",
        "C:/a.js",
    ] {
        assert!(changed("entry", json!(path)).is_err(), "{path}");
    }
}

#[test]
fn permissions_cannot_duplicate_overlap_or_invent_capabilities() {
    for permissions in [
        json!({"required":["storage","storage"],"optional":[]}),
        json!({"required":["storage"],"optional":["storage"]}),
        json!({"required":[],"optional":["shell"]}),
        json!({"required":[],"optional":[],"granted":true}),
    ] {
        assert!(changed("permissions", permissions).is_err());
    }
}

#[test]
fn undeclared_grants_are_not_exposed_and_optional_denial_is_explicit() {
    let m = ValidatedManifest::parse(FIXTURE).unwrap();
    let mut c = context();
    c.channel_allowed.insert(Capability::NotesRead);
    c.user_granted.insert(Capability::NotesRead);
    let result = assess(&m, &c).unwrap();
    assert_eq!(result.granted, [Capability::Storage].into_iter().collect());
    assert_eq!(
        result.optional_unavailable,
        vec![Unavailable {
            capability: Capability::Reminders,
            reason: Denial::Consent
        }]
    );
}

#[test]
fn required_capability_needs_all_three_trusted_grants() {
    let m = ValidatedManifest::parse(FIXTURE).unwrap();
    for gate in 0..3 {
        let mut c = context();
        let reason = match gate {
            0 => {
                c.implemented.clear();
                Denial::Unimplemented
            }
            1 => {
                c.channel_allowed.clear();
                Denial::Channel
            }
            _ => {
                c.user_granted.clear();
                Denial::Consent
            }
        };
        assert_eq!(
            assess(&m, &c).unwrap_err(),
            Rejection::Required(vec![Unavailable {
                capability: Capability::Storage,
                reason
            }])
        );
    }
}

#[test]
fn unsupported_platform_and_revoked_consent_reject() {
    let m = changed("platforms", json!(["ios"])).unwrap();
    assert_eq!(assess(&m, &context()).unwrap_err(), Rejection::Platform);
    let mut c = context();
    c.platform = Platform::Ios;
    assert!(assess(&m, &c).is_ok());
    c.user_granted.clear();
    assert!(assess(&m, &c).is_err());
}

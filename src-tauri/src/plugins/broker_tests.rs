use super::{
    admission::AdmissionContext,
    broker::{Broker, Error, Limits, Session},
    manifest::{Capability, Platform, ValidatedManifest},
};
use serde_json::{json, Value};

fn manifest(id: &str, required: bool) -> ValidatedManifest {
    let mut value: Value = serde_json::from_slice(include_bytes!(
        "../../../tests/fixtures/plugins/manifest.json"
    ))
    .unwrap();
    value["id"] = json!(id);
    value["permissions"] = if required {
        json!({"required":["storage"],"optional":[]})
    } else {
        json!({"required":[],"optional":["storage"]})
    };
    ValidatedManifest::parse(&serde_json::to_vec(&value).unwrap()).unwrap()
}
fn context() -> AdmissionContext {
    AdmissionContext {
        platform: Platform::Android,
        implemented: [Capability::Storage].into_iter().collect(),
        channel_allowed: [Capability::Storage].into_iter().collect(),
        user_granted: [Capability::Storage].into_iter().collect(),
    }
}
fn call(broker: &mut Broker, session: &Session, request: Value) -> Result<Value, Error> {
    broker.call(session, &serde_json::to_vec(&request).unwrap())
}
fn get(broker: &mut Broker, session: &Session) -> Value {
    call(
        broker,
        session,
        json!({"method":"storage.get","key":"course"}),
    )
    .unwrap()
}

#[test]
fn same_key_isolated_between_plugins_and_delete_is_local() {
    let mut broker = Broker::new(Limits::default());
    let a = broker
        .start(&manifest("org.example.a", true), &context())
        .unwrap();
    let b = broker
        .start(&manifest("org.example.b", true), &context())
        .unwrap();
    for (s, v) in [(&a, "A"), (&b, "B")] {
        call(
            &mut broker,
            s,
            json!({"method":"storage.set","key":"course","value":v}),
        )
        .unwrap();
    }
    assert_eq!(get(&mut broker, &a)["value"], "A");
    call(
        &mut broker,
        &a,
        json!({"method":"storage.delete","key":"course"}),
    )
    .unwrap();
    assert_eq!(get(&mut broker, &a)["found"], false);
    assert_eq!(get(&mut broker, &b)["value"], "B");
}

#[test]
fn request_identity_unknown_commands_and_paths_rejected() {
    let mut broker = Broker::new(Limits::default());
    let a = broker
        .start(&manifest("org.example.a", true), &context())
        .unwrap();
    for request in [
        json!({"method":"storage.get","key":"course","pluginId":"org.example.b"}),
        json!({"method":"notes.read","key":"course"}),
        json!({"method":"invoke","command":"load_notes"}),
        json!({"method":"storage.get","key":"../notes.json"}),
        json!({"method":"storage.get","key":"/notes"}),
        json!({"method":"storage.set","key":"course"}),
    ] {
        assert_eq!(call(&mut broker, &a, request), Err(Error::InvalidRequest));
    }
}

#[test]
fn stop_revokes_cloned_handles_but_keeps_data_and_other_sessions() {
    let mut broker = Broker::new(Limits::default());
    let m = manifest("org.example.a", true);
    let a = broker.start(&m, &context()).unwrap();
    let copied = a.clone();
    let b = broker
        .start(&manifest("org.example.b", true), &context())
        .unwrap();
    call(
        &mut broker,
        &a,
        json!({"method":"storage.set","key":"course","value":42}),
    )
    .unwrap();
    broker.stop(&m.get().id);
    for s in [&a, &copied] {
        assert_eq!(broker.call(s, b"{}"), Err(Error::Revoked));
    }
    assert_eq!(get(&mut broker, &b)["found"], false);
    let new = broker.start(&m, &context()).unwrap();
    assert_eq!(get(&mut broker, &new)["value"], 42);
}

#[test]
fn restart_rotates_session_and_denied_start_cannot_replace_active_session() {
    let mut broker = Broker::new(Limits::default());
    let m = manifest("org.example.a", true);
    let old = broker.start(&m, &context()).unwrap();
    let current = broker.start(&m, &context()).unwrap();
    assert_eq!(broker.call(&old, b"{}"), Err(Error::Revoked));
    let mut denied = context();
    denied.user_granted.clear();
    assert!(matches!(broker.start(&m, &denied), Err(Error::Admission)));
    assert_eq!(get(&mut broker, &current)["found"], false);
    // Consent revocation is an explicit host lifecycle action, not a failed install.
    broker.stop(&m.get().id);
    assert_eq!(broker.call(&current, b"{}"), Err(Error::Revoked));
}

#[test]
fn optional_permission_does_not_authorize_storage() {
    let mut broker = Broker::new(Limits::default());
    let mut denied = context();
    denied.user_granted.clear();
    let a = broker
        .start(&manifest("org.example.a", false), &denied)
        .unwrap();
    assert_eq!(
        broker.call(&a, br#"{"method":"storage.get","key":"course"}"#),
        Err(Error::Permission)
    );
}

#[test]
fn reauthorization_failure_revokes_old_grants_for_every_policy_layer() {
    let m = manifest("org.example.a", true);
    for layer in 0..3 {
        let mut broker = Broker::new(Limits::default());
        let old = broker.start(&m, &context()).unwrap();
        let mut next = context();
        match layer {
            0 => next.implemented.clear(),
            1 => next.channel_allowed.clear(),
            _ => next.user_granted.clear(),
        }
        assert!(matches!(
            broker.reauthorize(&m, &next),
            Err(Error::Admission)
        ));
        assert_eq!(broker.call(&old, b"{}"), Err(Error::Revoked));
        let new = broker.reauthorize(&m, &context()).unwrap();
        assert_eq!(get(&mut broker, &new)["found"], false);
        assert_eq!(broker.call(&old, b"{}"), Err(Error::Revoked));
    }
}

#[test]
fn quotas_reject_atomically_and_overwrite_releases_old_size() {
    let mut broker = Broker::new(Limits {
        request_bytes: 256,
        storage_bytes: 14,
        storage_keys: 1,
    });
    let a = broker
        .start(&manifest("org.example.a", true), &context())
        .unwrap();
    call(
        &mut broker,
        &a,
        json!({"method":"storage.set","key":"course","value":"old"}),
    )
    .unwrap();
    assert_eq!(
        call(
            &mut broker,
            &a,
            json!({"method":"storage.set","key":"course","value":"too large"})
        ),
        Err(Error::Quota)
    );
    assert_eq!(get(&mut broker, &a)["value"], "old");
    assert_eq!(
        call(
            &mut broker,
            &a,
            json!({"method":"storage.set","key":"other","value":0})
        ),
        Err(Error::Quota)
    );
    call(
        &mut broker,
        &a,
        json!({"method":"storage.set","key":"course","value":"new"}),
    )
    .unwrap();
    assert_eq!(get(&mut broker, &a)["value"], "new");
    assert_eq!(broker.call(&a, &vec![b' '; 257]), Err(Error::Quota));
}

#[test]
fn handles_from_another_broker_are_invalid() {
    let mut a = Broker::new(Limits::default());
    let mut b = Broker::new(Limits::default());
    let session = a
        .start(&manifest("org.example.a", true), &context())
        .unwrap();
    assert_eq!(b.call(&session, b"{}"), Err(Error::Revoked));
}

#[test]
fn null_value_is_distinct_from_missing_and_bad_input_keeps_data() {
    let mut broker = Broker::new(Limits::default());
    let a = broker
        .start(&manifest("org.example.a", true), &context())
        .unwrap();
    call(
        &mut broker,
        &a,
        json!({"method":"storage.set","key":"course","value":null}),
    )
    .unwrap();
    assert_eq!(get(&mut broker, &a), json!({"found":true,"value":null}));
    for bytes in [
        b"{".as_slice(),
        br#"{"method":"storage.get","key":"course","key":"other"}"#.as_slice(),
    ] {
        assert_eq!(broker.call(&a, bytes), Err(Error::InvalidRequest));
    }
    assert_eq!(get(&mut broker, &a)["found"], true);
}

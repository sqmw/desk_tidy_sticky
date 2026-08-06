use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

#[cfg(target_os = "windows")]
use std::time::Duration;
#[cfg(target_os = "windows")]
use tauri::Manager;

#[cfg(target_os = "windows")]
const NOTE_WINDOW_PREFIX: &str = "note-";
#[cfg(target_os = "windows")]
const DISPLAY_MOVE_DEBOUNCE: Duration = Duration::from_millis(180);

#[derive(Clone, Default)]
pub struct StickyDisplayRecoveryState(Arc<Mutex<HashMap<String, u64>>>);

#[derive(Debug, PartialEq, Eq)]
enum DebounceAction {
    Ready,
    Wait(u64),
    Cancelled,
}

impl StickyDisplayRecoveryState {
    fn schedule(&self, note_id: &str) -> Result<(u64, bool), String> {
        let mut generations = self.0.lock().map_err(|e| e.to_string())?;
        let should_spawn = !generations.contains_key(note_id);
        let generation = generations
            .get(note_id)
            .copied()
            .unwrap_or(0)
            .wrapping_add(1);
        generations.insert(note_id.to_string(), generation);
        Ok((generation, should_spawn))
    }

    fn settle(&self, note_id: &str, generation: u64) -> DebounceAction {
        let Ok(mut generations) = self.0.lock() else {
            return DebounceAction::Cancelled;
        };
        match generations.get(note_id).copied() {
            Some(current) if current == generation => {
                generations.remove(note_id);
                DebounceAction::Ready
            }
            Some(current) => DebounceAction::Wait(current),
            None => DebounceAction::Cancelled,
        }
    }
}

#[cfg(target_os = "windows")]
pub fn schedule_hidden_note_recovery(app: &tauri::AppHandle, window_label: &str) {
    let Some(note_id) = window_label.strip_prefix(NOTE_WINDOW_PREFIX) else {
        return;
    };
    let Some(state) = app.try_state::<StickyDisplayRecoveryState>() else {
        return;
    };
    let state = state.inner().clone();
    let Ok((generation, should_spawn)) = state.schedule(note_id) else {
        return;
    };
    if !should_spawn {
        return;
    }
    let app = app.clone();
    let note_id = note_id.to_string();

    std::thread::spawn(move || {
        let mut observed_generation = generation;
        loop {
            std::thread::sleep(DISPLAY_MOVE_DEBOUNCE);
            match state.settle(&note_id, observed_generation) {
                DebounceAction::Ready => break,
                DebounceAction::Wait(current) => observed_generation = current,
                DebounceAction::Cancelled => return,
            }
        }
        if let Err(error) =
            super::auto_hide::recover_hidden_note_window_position(app, note_id.clone())
        {
            eprintln!("sticky display recovery failed for {}: {}", note_id, error);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn newest_move_generation_supersedes_previous_work() {
        let state = StickyDisplayRecoveryState::default();
        let (first, first_spawns) = state.schedule("one").expect("first generation");
        let (second, second_spawns) = state.schedule("one").expect("second generation");

        assert!(first_spawns);
        assert!(!second_spawns);
        assert_eq!(state.settle("one", first), DebounceAction::Wait(second));
        assert_eq!(state.settle("one", second), DebounceAction::Ready);
        assert_eq!(state.settle("one", second), DebounceAction::Cancelled);
    }

    #[test]
    fn note_windows_debounce_independently() {
        let state = StickyDisplayRecoveryState::default();
        let (first, first_spawns) = state.schedule("one").expect("first note generation");
        let (second, second_spawns) = state.schedule("two").expect("second note generation");

        assert!(first_spawns);
        assert!(second_spawns);
        assert_eq!(state.settle("one", first), DebounceAction::Ready);
        assert_eq!(state.settle("two", second), DebounceAction::Ready);
    }
}

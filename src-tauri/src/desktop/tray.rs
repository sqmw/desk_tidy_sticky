use crate::desktop::{apply_overlay_input_state, show_preferred_panel_window};
use crate::runtime::GlobalControlState;
use std::collections::HashMap;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

struct TrayMenuState {
    show: MenuItem<tauri::Wry>,
    github: MenuItem<tauri::Wry>,
    toggle_stickies: MenuItem<tauri::Wry>,
    toggle_interaction: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
}

#[tauri::command]
pub fn update_tray_texts(
    app: tauri::AppHandle,
    texts: HashMap<String, String>,
) -> Result<(), String> {
    if let Some(state) = app.try_state::<TrayMenuState>() {
        if let Some(t) = texts
            .get("trayShowMain")
            .or_else(|| texts.get("trayShowNotes"))
        {
            let _ = state.show.set_text(t);
        }
        if let Some(t) = texts.get("trayGithub") {
            let _ = state.github.set_text(t);
        }
        if let Some(t) = texts.get("trayStickiesClose") {
            let _ = state.toggle_stickies.set_text(t);
        }
        if let Some(t) = texts.get("trayStickiesShow") {
            let _ = state.toggle_stickies.set_text(t);
        }
        if let Some(t) = texts.get("trayInteraction") {
            let _ = state.toggle_interaction.set_text(t);
        }
        if let Some(t) = texts.get("trayQuit") {
            let _ = state.quit.set_text(t);
        }
    }
    Ok(())
}

pub fn build_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show main window", true, None::<&str>)?;
    let github_i = MenuItem::with_id(app, "github", "Star on GitHub", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let toggle_stickies_i = MenuItem::with_id(
        app,
        "toggle_stickies",
        "Stickers: Close",
        true,
        None::<&str>,
    )?;
    let toggle_interaction_i = MenuItem::with_id(
        app,
        "toggle_interaction",
        "Stickers: Toggle Global Control",
        true,
        None::<&str>,
    )?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_i,
            &github_i,
            &sep1,
            &toggle_stickies_i,
            &toggle_interaction_i,
            &sep2,
            &quit_i,
        ],
    )?;

    app.manage(TrayMenuState {
        show: show_i,
        github: github_i,
        toggle_stickies: toggle_stickies_i,
        toggle_interaction: toggle_interaction_i,
        quit: quit_i,
    });

    #[cfg(target_os = "macos")]
    let tray_icon = Image::from_bytes(include_bytes!("../../icons/tray-template.png"))?;
    #[cfg(not(target_os = "macos"))]
    let tray_icon = Image::from_bytes(include_bytes!("../../icons/tray-color.png"))?;

    let tray_builder = TrayIconBuilder::new()
        .icon(tray_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_preferred_panel_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| {
            if event.id.as_ref() == "show" {
                show_preferred_panel_window(app);
            } else if event.id.as_ref() == "github" {
                let _ = open::that("https://github.com/sqmw/desk_tidy_sticky");
            } else if event.id.as_ref() == "toggle_stickies" {
                let _ = app.emit("tray_overlay_toggle", ());
            } else if event.id.as_ref() == "toggle_interaction" {
                if let Some(state) = app.try_state::<GlobalControlState>() {
                    let interaction_disabled = state.toggle();
                    apply_overlay_input_state(app, interaction_disabled);
                    let _ = app.emit("global_control_changed", interaction_disabled);
                }
            } else if event.id.as_ref() == "quit" {
                app.exit(0);
            }
        });

    #[cfg(target_os = "macos")]
    let tray_builder = tray_builder.icon_as_template(true);
    #[cfg(not(target_os = "macos"))]
    let tray_builder = tray_builder.icon_as_template(false);

    let _tray = tray_builder.build(app)?;
    Ok(())
}

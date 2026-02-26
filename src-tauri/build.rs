fn main() {
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=icons/icon.icns");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/dock-icon.svg");
    println!("cargo:rerun-if-changed=icons/dock-icon.png");
    println!("cargo:rerun-if-changed=icons/tray-template.svg");
    println!("cargo:rerun-if-changed=icons/tray-template.png");
    println!("cargo:rerun-if-changed=icons/tray-color.png");
    tauri_build::build()
}

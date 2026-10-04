//! Karban jako desktopová aplikace: okno se systémovým WebView, ve kterém běží webový build hry (`dist/`).
//!
//! Nativní kód je jen tenký obal. Hra sama zůstává stejná jako na webu; jediný příkaz navíc je uložení exportu
//! přes nativní dialog, protože prohlížečové stažení souboru ve WebView nefunguje (src/ui/desktop.ts).

use tauri_plugin_dialog::DialogExt;

/// Uloží export (profil, nastavení a rozehraný run) do souboru, který hráč vybere v nativním dialogu „Uložit“.
/// Vrací cestu k zapsanému souboru, nebo `None`, když hráč dialog zavřel.
#[tauri::command]
async fn save_export(
    app: tauri::AppHandle,
    file_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter("Uložení Karbanu", &["json"])
        .blocking_save_file();
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, contents).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_export])
        .run(tauri::generate_context!())
        .expect("Karban se nepodařilo spustit");
}

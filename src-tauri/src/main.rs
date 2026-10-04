// Na Windows v release bez okna konzole vedle hry.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    karban_lib::run();
}

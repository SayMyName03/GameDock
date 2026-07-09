use crate::config;
use crate::db;
use rusqlite::Connection;
use std::path::Path;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter};

/// How long to wait for a Steam-launched process to appear in the process list
/// before giving up on exit detection.
const STEAM_APPEAR_TIMEOUT: Duration = Duration::from_secs(60);
/// Poll interval while waiting for a Steam process to appear / disappear.
const POLL_INTERVAL: Duration = Duration::from_millis(750);
/// Once a Steam process has been seen, require this many consecutive empty
/// samples before deciding it has exited. Guards against launcher -> game handoff
/// where the matching set briefly becomes empty.
const EXIT_DEBOUNCE_SAMPLES: u32 = 3;

static RUNNING: Mutex<Option<RunningGame>> = Mutex::new(None);

pub struct RunningGame {
    pub game_id: i64,
    /// Direct child for epic/manual launches. None for Steam (we can't own the
    /// game process that Steam itself spawns).
    pub child: Option<Child>,
    /// Install directory of the game for Steam exit polling. None for epic/manual.
    pub install_dir: Option<String>,
}

pub struct LaunchResult {
    pub session_id: i64,
}

/// Is a game currently tracked as running? Used to refuse concurrent launches.
pub fn is_game_running() -> bool {
    RUNNING.lock().unwrap().is_some()
}

/// Returns the game_id of the currently running game, or None.
pub fn running_game_id() -> Option<i64> {
    RUNNING.lock().unwrap().as_ref().map(|r| r.game_id)
}

/// Launch a game and begin tracking its lifetime on a background thread.
///
/// `launch_game` itself returns as soon as the process is spawned; exit detection
/// and session finalization happen asynchronously so the IPC worker thread is
/// never held for the duration of the game (which used to freeze the UI via the
/// caller's awaited `wait_for_exit`).
///
/// On exit, the background thread:
///   - writes `end_play_session` to the DB; and
///   - emits the `game:exited` event with `{ gameId, durationSeconds }`.
///
/// This makes `game:exited` the single source of truth for the end of a session.
pub fn launch_game(
    conn: &Connection,
    game_id: i64,
    app: AppHandle,
) -> Result<LaunchResult, String> {
    if is_game_running() {
        return Err("A game is already running".to_string());
    }

    let game = db::get_game_by_id(conn, game_id)?;
    let session_id = db::create_play_session(conn, game_id)?;

    let (child, install_dir) = match game.source.as_str() {
        "steam" => spawn_steam(game.source_id.as_deref(), game.install_dir.as_deref())?,
        "epic" | "manual" => (Some(spawn_direct(game.exe_path.as_deref())?), None),
        other => return Err(format!("Unknown game source: {}", other)),
    };

    {
        let mut running = RUNNING.lock().unwrap();
        *running = Some(RunningGame {
            game_id,
            child,
            install_dir,
        });
    }

    let _ = app.emit("game:launched", serde_json::json!({ "gameId": game_id }));

    let source = game.source.clone();
    thread::spawn(move || {
        // RAII guard guarantees RUNNING is cleared even if the wait panics.
        struct ClearRunning;
        impl Drop for ClearRunning {
            fn drop(&mut self) {
                let mut running = RUNNING.lock().unwrap();
                *running = None;
            }
        }
        let _guard = ClearRunning;

        // Wait for the game to exit, then reopen a DB connection (the command's
        // State<Db> is not Send-safe across this thread boundary) and finalize
        // the play session.
        match source.as_str() {
            "epic" | "manual" => wait_for_child_exit(),
            "steam" => wait_for_steam_exit(),
            _ => {}
        }

        let duration = match config::db_path().and_then(|p| db::open(&p)) {
            Ok(db) => {
                let conn2 = db.0.lock().expect("DB mutex poisoned");
                match db::end_play_session(&conn2, session_id, game_id) {
                    Ok(d) => d,
                    Err(e) => {
                        eprintln!("end_play_session failed for game {}: {}", game_id, e);
                        0
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to reopen DB for session finalization: {}", e);
                0
            }
        };

        let _ = app.emit(
            "game:exited",
            serde_json::json!({ "gameId": game_id, "durationSeconds": duration }),
        );
    });

    Ok(LaunchResult { session_id })
}

fn spawn_steam(
    source_id: Option<&str>,
    install_dir: Option<&str>,
) -> Result<(Option<Child>, Option<String>), String> {
    let appid = source_id.ok_or("Steam game missing source_id")?;
    // `cmd /C start "" ...` forks to Steam's URL handler and exits immediately.
    // We do NOT keep the Child — child.wait() would return in <1s. Exit detection
    // instead polls the process list against the game's install_dir.
    Command::new("cmd")
        .args(["/C", "start", "", &format!("steam://run/{}", appid)])
        .spawn()
        .map_err(|e| format!("Failed to launch Steam game: {}", e))?;
    Ok((None, install_dir.map(|s| s.to_string())))
}

fn spawn_direct(exe_path: Option<&str>) -> Result<Child, String> {
    let exe = exe_path.ok_or("Game missing executable path")?;
    Command::new(exe)
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))
}

/// Wait on the direct child process we own (epic/manual). The child handle is
/// taken out of RUNNING so the wait doesn't hold the mutex.
fn wait_for_child_exit() {
    let mut child_opt = {
        let mut running = RUNNING.lock().unwrap();
        running.as_mut().and_then(|r| r.child.take())
    };
    if let Some(ref mut child) = child_opt {
        let _ = child.wait();
    }
}

/// Poll the process list for a process whose executable lives under the game's
/// install_dir, and return when it has gone away. This replaces child.wait() for
/// Steam games, which `cmd /C start steam://run/<appid>` hands off to Steam.
fn wait_for_steam_exit() {
    let install_dir = {
        let running = RUNNING.lock().unwrap();
        match running.as_ref().and_then(|r| r.install_dir.clone()) {
            Some(d) => d,
            None => {
                eprintln!("Steam exit tracking skipped: install_dir not known");
                return;
            }
        }
    };
    let prefix = normalize_dir(&install_dir);

    let mut sys = System::new();
    let mut matched = false;
    let mut empty_samples: u32 = 0;

    let first_deadline = Instant::now() + STEAM_APPEAR_TIMEOUT;

    loop {
        sys.refresh_processes(ProcessesToUpdate::All, true);
        let has_match = any_process_in_dir(&sys, &prefix);

        if has_match {
            matched = true;
            empty_samples = 0;
        }
        thread::sleep(POLL_INTERVAL);

        if !matched {
            // Phase 1: game process has not appeared yet.
            if Instant::now() > first_deadline {
                eprintln!(
                    "Steam game process did not appear under {} within {:?}; giving up on exit tracking",
                    install_dir, STEAM_APPEAR_TIMEOUT
                );
                return;
            }
        } else if !has_match {
            // Phase 2: we've seen the game, and now no matching process is alive.
            // Debounce against brief gaps during launcher -> game handoff.
            empty_samples += 1;
            if empty_samples >= EXIT_DEBOUNCE_SAMPLES {
                return;
            }
        }
    }
}

fn any_process_in_dir(sys: &System, prefix: &str) -> bool {
    for proc in sys.processes().values() {
        if let Some(exe) = proc.exe() {
            let exe_str = path_to_string(exe);
            if exe_str.starts_with(prefix) {
                return true;
            }
        }
    }
    false
}

/// Normalize a Windows install path so it can be compared as a case- and
/// separator-insensitive prefix against process exe paths.
fn normalize_dir(dir: &str) -> String {
    dir.to_lowercase().replace('/', "\\")
}

fn path_to_string(path: &Path) -> String {
    let s = path.to_string_lossy().to_string();
    s.replace('/', "\\").to_lowercase()
}

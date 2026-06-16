#!/usr/bin/env bash
#
# Deepiri Lyback — one-shot setup.
#
#   ./setup.sh          Install everything (Node deps, including Electron).
#   ./setup.sh --run    Install everything, then launch the desktop studio.
#   ./setup.sh --kill   Stop all Lyback / hosted game processes.
#   ./setup.sh --help   Show this help.
#
set -euo pipefail

# --- pretty output -----------------------------------------------------------
if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"; GREEN="$(printf '\033[32m')"
  YELLOW="$(printf '\033[33m')"; RED="$(printf '\033[31m')"; RESET="$(printf '\033[0m')"
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; RESET=""
fi
info()  { printf '%s\n' "${GREEN}==>${RESET} ${BOLD}$*${RESET}"; }
warn()  { printf '%s\n' "${YELLOW}warning:${RESET} $*"; }
die()   { printf '%s\n' "${RED}error:${RESET} $*" >&2; exit 1; }

# --- args --------------------------------------------------------------------
RUN=0
KILL=0
for arg in "$@"; do
  case "$arg" in
    --run)  RUN=1 ;;
    --kill) KILL=1 ;;
    --help|-h)
      sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "unknown option: $arg (try --help)" ;;
  esac
done

# Run from the repo root regardless of where the script was invoked.
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

# --- kill (optional) ---------------------------------------------------------
kill_repo_processes() {
  declare -A seen=()
  local -a pids=()
  local pid cmd line base game_dir

  ports_from_cmd() {
    local s="$1" m
    while [[ "$s" =~ (-l|--listen|--port|-p)[=[:space:]]+([0-9]+) ]]; do
      echo "${BASH_REMATCH[2]}"
      m="${BASH_REMATCH[0]}"
      s="${s/$m/}"
    done
  }

  ports_from_package_json() {
    local pkg="$1"
    [ -f "$pkg" ] || return
    command -v node >/dev/null 2>&1 || return
    node -e '
      const fs = require("fs");
      const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const ports = new Set();
      const re = /(?:-l|--listen|--port|-p)[=\s]+(\d+)/g;
      for (const script of Object.values(pkg.scripts || {})) {
        for (const m of String(script).matchAll(re)) ports.add(m[1]);
      }
      for (const p of ports) console.log(p);
    ' "$pkg" 2>/dev/null || true
  }

  collect_host_ports() {
    declare -A ports=()
    local base port cmd

    while IFS= read -r port; do
      [ -n "$port" ] && ports[$port]=1
    done < <(ports_from_package_json "$REPO_ROOT/package.json")

    for game_dir in "$REPO_ROOT"/*/; do
      base="$(basename "$game_dir")"
      case "$base" in node_modules|tools|src|electron|assets|.github) continue ;; esac
      [ -f "${game_dir}package.json" ] || continue
      while IFS= read -r port; do
        [ -n "$port" ] && ports[$port]=1
      done < <(ports_from_package_json "${game_dir}package.json")
    done

    # Ports from live serve processes (covers fallback when the requested port is taken).
    while IFS= read -r line; do
      [ -n "$line" ] || continue
      cmd="${line#* }"
      [[ "$cmd" == *"$REPO_ROOT"* ]] || continue
      [[ "$cmd" == *serve* ]] || continue
      while IFS= read -r port; do
        [ -n "$port" ] && ports[$port]=1
      done < <(ports_from_cmd "$cmd")
    done < <(pgrep -af serve 2>/dev/null || true)

    for port in "${!ports[@]}"; do
      echo "$port"
    done
  }

  add_pids_on_port() {
    local port="$1" pid cmd
    if command -v fuser >/dev/null 2>&1; then
      while IFS= read -r pid; do
        cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
        matches_repo_process "$cmd" && add_pid "$pid"
      done < <(fuser -n tcp "$port" 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+$' || true)
    elif command -v lsof >/dev/null 2>&1; then
      while IFS= read -r pid; do
        cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
        matches_repo_process "$cmd" && add_pid "$pid"
      done < <(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    fi
  }

  add_pid() {
    local p="$1"
    [[ "$p" =~ ^[0-9]+$ ]] || return
    [ "$p" -eq $$ ] && return
    [ "$p" -eq "$PPID" ] && return
    [ -n "${seen[$p]:-}" ] && return
    seen[$p]=1
    pids+=("$p")
  }

  matches_repo_process() {
    case "$1" in
      bash*|/bin/sh*|zsh*|fish*|*setup.sh*) return 1 ;;
      *"$REPO_ROOT/electron/main.js"*) return 0 ;;
      *"$REPO_ROOT/node_modules/"*"electron"*) return 0 ;;
      *"$REPO_ROOT/node_modules/.bin/serve"*) return 0 ;;
      *node*"$REPO_ROOT"*) return 0 ;;
      *npm*"$REPO_ROOT"*) return 0 ;;
    esac
    return 1
  }

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    pid="${line%% *}"
    cmd="${line#* }"
    if matches_repo_process "$cmd"; then
      add_pid "$pid"
    fi
  done < <(pgrep -af . 2>/dev/null || true)

  # Sibling game folders (cavesweat today; any future */package.json at repo root).
  for game_dir in "$REPO_ROOT"/*/; do
    base="$(basename "$game_dir")"
    case "$base" in node_modules|tools|src|electron|assets|.github) continue ;; esac
    [ -f "${game_dir}package.json" ] || continue
    while IFS= read -r line; do
      [ -n "$line" ] || continue
      pid="${line%% *}"
      cmd="${line#* }"
      if matches_repo_process "$cmd"; then
        add_pid "$pid"
      fi
    done < <(pgrep -af "$REPO_ROOT/$base" 2>/dev/null || true)
  done

  # Host ports from package.json scripts + live serve processes.
  while IFS= read -r port; do
    [ -n "$port" ] && add_pids_on_port "$port"
  done < <(collect_host_ports)

  if [ "${#pids[@]}" -eq 0 ]; then
    info "No running Lyback / game processes found."
    return 0
  fi

  info "Stopping ${#pids[@]} process(es)..."
  for pid in "${pids[@]}"; do
    cmd="$(ps -p "$pid" -o args= 2>/dev/null || echo "(already exited)")"
    printf '  %s  %s\n' "$pid" "$cmd"
    kill "$pid" 2>/dev/null || true
  done

  sleep 0.5
  for pid in "${pids[@]}"; do
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  done

  info "All Lyback / game processes stopped."
}

if [ "$KILL" -eq 1 ]; then
  kill_repo_processes
  exit 0
fi

# --- prerequisites -----------------------------------------------------------
command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node 18+ from https://nodejs.org and re-run."
command -v npm  >/dev/null 2>&1 || die "npm is not installed (it ships with Node.js)."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  warn "Node $(node -v) detected; this project targets Node 18+. Things may not work."
fi

info "Node $(node -v), npm $(npm -v)"

# --- install -----------------------------------------------------------------
info "Installing dependencies (this pulls Electron, ~200 MB — first run is slow)..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
info "Dependencies installed."

# --- run (optional) ----------------------------------------------------------
if [ "$RUN" -eq 1 ]; then
  # On some Linux setups Electron's sandbox needs a SUID helper that isn't set;
  # fall back to a sandbox-less launch so the studio still opens.
  EXTRA=""
  if [ "$(uname -s)" = "Linux" ]; then
    SANDBOX="node_modules/electron/dist/chrome-sandbox"
    if [ -f "$SANDBOX" ] && [ ! -u "$SANDBOX" ]; then
      warn "Electron sandbox helper isn't SUID-root; launching with --no-sandbox."
      warn "To enable the sandbox: sudo chown root:root $SANDBOX && sudo chmod 4755 $SANDBOX"
      EXTRA="--no-sandbox"
    fi
  fi
  # Run detached so it keeps going after this shell exits (it's a wallpaper app)
  # and the terminal is returned to you immediately. The app's single-instance
  # lock means re-running --run just focuses/forwards to the running window.
  ELECTRON="node_modules/.bin/electron"
  [ -x "$ELECTRON" ] || ELECTRON="npx electron"
  LOG="${TMPDIR:-/tmp}/deepiri-lyback.log"
  info "Launching Deepiri Lyback in the background..."
  nohup $ELECTRON electron/main.js $EXTRA >"$LOG" 2>&1 &
  PID=$!
  disown 2>/dev/null || true
  info "Running as PID ${PID} (logs: ${LOG})"
  info "Stop it with:  ${BOLD}./setup.sh --kill${RESET}"
  exit 0
fi

info "Done. Launch the studio anytime with:  ${BOLD}./setup.sh --run${RESET}   (or  npm start)"

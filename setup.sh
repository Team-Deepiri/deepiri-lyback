#!/usr/bin/env bash
#
# Deepiri Lyback — one-shot setup.
#
#   ./setup.sh          Install everything (Node deps, including Electron).
#   ./setup.sh --run    Install everything, then launch the desktop studio.
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
for arg in "$@"; do
  case "$arg" in
    --run)  RUN=1 ;;
    --help|-h)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "unknown option: $arg (try --help)" ;;
  esac
done

# Run from the repo root regardless of where the script was invoked.
cd "$(dirname "$0")"

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
  info "Stop it with:  ${BOLD}kill ${PID}${RESET}"
  exit 0
fi

info "Done. Launch the studio anytime with:  ${BOLD}./setup.sh --run${RESET}   (or  npm start)"

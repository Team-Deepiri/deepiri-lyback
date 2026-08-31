# Lyback multiplayer — 4-player P2P

Plan only. Nothing here is implemented.

Goal: up to **4 players**, connected **peer-to-peer**, sharing a Lyback
interactive session.

---

## 1. Starting position

Lyback today is:

- **vanilla JavaScript, zero runtime dependencies** (`package.json` has no
  `dependencies`)
- driven by `src/interactive-background/core-engine.js` and `world-engine.js`
- shipped as static files — the deployed container is nginx serving a build
- **no networking of any kind.** No WebSocket, no RTCPeerConnection, no
  socket.io, nothing. This is a from-scratch addition, not an extension.

The zero-dependency property is worth protecting. Everything below can be built
on the browser's native `RTCPeerConnection` and `WebSocket` without pulling in a
framework.

---

## 2. "P2P" still requires servers

This is the single most common misunderstanding about WebRTC, so stating it
plainly: peers cannot find each other on their own.

| piece | why | cost |
|---|---|---|
| **Signaling** | exchange SDP offers/answers and ICE candidates, manage rooms | tiny — connection setup only |
| **STUN** | discover your own public address behind NAT | free (public servers) |
| **TURN** | relay when a direct path cannot be established | real bandwidth |

Game traffic goes peer-to-peer once connected. But **without a signaling server
there is no connection at all**, and the signaling service is a new long-lived
process that has to be deployed, monitored and kept up.

### TURN is not optional in practice

Roughly **10–20% of real-world connections cannot establish a direct path** —
symmetric NAT, restrictive corporate networks, some mobile carriers. Without
TURN those players simply fail to join.

The failure is nasty because it is **invisible in testing**: it works perfectly
between two machines on the same network, and fails only for a minority of real
users, intermittently, in a way that looks like a flaky bug rather than a
network-topology problem.

Decide deliberately:

- **Ship without TURN** — accept that a minority of players cannot connect.
  Acceptable for a casual/demo feature *if the UI says so clearly* rather than
  hanging on "connecting…".
- **Run coturn** — everyone connects, and relayed sessions cost bandwidth.

Either is defensible. Silently shipping without TURN and treating the reports as
bugs is not.

---

## 3. Topology — full mesh

At a hard cap of 4 players, **full mesh**: every peer connects to every other.

    peers   connections = n(n-1)/2
      2            1
      3            3
      4            6

Six connections per session. Lowest latency, no relay hop, no single peer
carrying everyone else's traffic.

This works *because* of the 4-player cap. Mesh grows quadratically — at 8
players it is 28 connections and upload bandwidth on the weakest peer becomes
the ceiling. **If the cap ever rises, this design must be revisited**, not
scaled.

Enforce the cap in the signaling server, not the client. A client-side check is
advisory.

---

## 4. Authority — decide this first

P2P has no referee. Two viable models:

### Host-authoritative (recommended)
One peer owns the simulation; others send input and render what they are told.

- simple, predictable, no determinism requirement
- the host can cheat — irrelevant for a cooperative wallpaper toy, fatal for
  anything competitive
- **the host leaving ends the session** unless host migration is built, which is
  substantially more work than it sounds

### Lockstep / deterministic
Every peer runs the same simulation on the same inputs.

- no single owner, no migration problem
- requires **bit-identical determinism** across browsers. Floating-point
  differences, `Math.random()` without a seeded PRNG, `Map`/`Set` iteration
  order, and anything time-based will desync peers.
- `world-engine.js` would need auditing for all of the above, plus a seeded PRNG
  and a desync detection/resync path

**Recommendation: host-authoritative**, given this is an interactive background
rather than a competitive game. Lockstep's determinism burden is not worth it
here, and it is the harder thing to debug when it goes wrong.

---

## 5. Shape of the work

1. **Signaling service** — small WebSocket server: create/join room by code, cap
   at 4, relay SDP + ICE, notify on peer join/leave. Stateless apart from
   in-memory room membership.
2. **Peer layer in Lyback** — `RTCPeerConnection` per remote peer, one ordered
   `RTCDataChannel` each. Native API, no new dependency.
3. **State sync** — host broadcasts snapshots/deltas; clients send input. Rate
   and payload shape depend on what `world-engine.js` actually mutates per tick,
   which needs measuring before choosing.
4. **Session UI** — room code, player list, connection state, and an explicit
   failure state. "Could not connect — your network blocks direct connections"
   is far better than a spinner that never resolves.

---

## 6. Deployment notes

Relevant to how this repo is actually hosted:

- Lyback is served as **static files behind nginx** and is moving to
  `games.deepiri.com/lyback`. The signaling server is a **separate long-lived
  process** — a new container, not part of the static bundle.
- The WebSocket route needs `Upgrade`/`Connection` headers and a raised
  `proxy_read_timeout`; **idle WebSockets die at nginx's 60s default**, which
  presents as players being randomly disconnected while idle.
- Use the **resolver pattern** for its nginx upstream — a static `upstream`
  block caches the container IP at startup, and a redeploy of the signaling
  container would strand nginx on a dead address. This exact failure has
  happened twice on this box.
- Give it a **healthcheck**. A dead signaling server breaks matchmaking while
  the game itself still loads perfectly, so nothing else would reveal it.

---

## 7. Suggested sequencing

1. Decide **authority model** and **TURN**. Both are cheap now and expensive to
   change once state sync is written.
2. Signaling service + deployment (container, nginx route, healthcheck).
3. Peer connection layer, 2 players, no game state — just prove connect/
   disconnect/reconnect.
4. State sync for 2 players.
5. Raise to 4, mesh, test with a peer that genuinely cannot connect directly.

Steps 1 and 2 are infrastructure and independent of the game. Steps 3–5 are
where the design decisions in section 4 start costing money if they were wrong.

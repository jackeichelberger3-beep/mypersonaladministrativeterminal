# TerminalOS

A retro, MS-DOS-style terminal that runs entirely in the browser. It boots with a classic BIOS memory-check / hardware-detection sequence, requires a corner login window, accepts typed commands, maintains a virtual file system, and includes a **multi-window sandboxed runtime** so you can write HTML, CSS, and JavaScript files and execute them — individually or several at once, side-by-side — inside isolated iframes.

There are two versions of the project:

1. **Base44 app** (`src/`) — the full React build with Web Audio sound, themed styling, Matrix rain, and a canvas Snake game.
2. **Standalone GitHub version** (`public/standalone/`) — pure `index.html` + `style.css` + `script.js` with no build step, no dependencies, no framework. Drop it on any static host (GitHub Pages, Netlify, a USB stick) and it runs. **Every feature below is mirrored here.**

---

## Login

Before the prompt appears, a small login window opens in the **top-left corner** of the screen. Enter the credentials below to unlock the terminal.

```
USER: admin
PASS: dos2026
```

These are fixed credentials, documented here in the README (GitHub version). Wrong input shows an error and clears the password field.

---

## Table of contents

- [Quick start](#quick-start)
- [The runtime environment (webpage & OS making)](#the-runtime-environment-webpage--os-making)
- [Running multiple apps at once](#running-multiple-apps-at-once)
- [Batch processing](#batch-processing)
- [Commands](#commands)
- [Advanced features](#advanced-features)
- [File map](#file-map)

---

## Quick start

**Base44 app:** open the preview — the login window appears first, then the boot sequence, then the shell.

**Standalone:** open `public/standalone/index.html` in any browser, or serve the folder:

```bash
cd public/standalone
python3 -m http.server 8080
# visit http://localhost:8080
```

Type `help` to see every command.

---

## The runtime environment (webpage & OS making)

TerminalOS lets you build and run small web programs from inside the terminal itself, using a virtual file system and sandboxed iframes.

### Making a webpage / mini-OS

1. Scaffold a starter project with a template:

   ```
   os new basic      # a simple HTML page
   os new neon       # glowing neon theme
   os new hacker     # streaming "hacking" logs
   os new anime      # a domain-expansion intro
   ```

   This creates three files in the current directory: `index.html`, `style.css`, `main.js`.

2. Edit any of them with the built-in terminal editor:

   ```
   edit index.html
   ```

   Type your code line by line. Type `:wq` on its own line to save and exit, or `:q` to discard.

3. Run them **all together** as one page:

   ```
   boot
   ```

   This opens a sandboxed iframe, injects `style.css` into the HTML `<head>` and `main.js` before `</body>`, and runs the whole thing.

### Running scripts individually (not required)

You don't have to boot the full page. The `run` command dispatches by file type:

- **Run a JavaScript file** — `run greet.js`
- **Run an HTML file** — `run index.html` (boots that page, auto-injecting sibling `style.css` + `main.js`)
- **Run a CSS file** — `run style.css` (previews the stylesheet inside a minimal HTML wrapper)
- **Run inline JavaScript** — `run 2 + 2 * 3` or `run var x = 5; for (var i=0;i<3;i++) x++; x`

### Opening URLs in iframes

```
url example.com
url https://example.com
```

Opens the address in its own sandboxed iframe window. (`browser` is an alias for `url`.)

### Sandbox security

App iframes use `sandbox="allow-scripts"` (no `allow-same-origin`), so authored code cannot reach your terminal, your site cookies, or the rest of the browser. URL windows add `allow-same-origin allow-forms allow-popups` so sites can function (many sites still refuse to be embedded).

---

## Running multiple apps at once

Every `boot`, `run index.html`, `run style.css`, and `url` opens a **separate floating window**. You can open several and use them side-by-side while the terminal stays fully usable behind them — they run concurrently in their own iframes.

```
os new basic
boot            # window 1
os new neon
boot            # window 2 — side by side with window 1
url example.com # window 3
```

Use `shutdown` to close **all** runtime windows, or each window's `close` button to close one.

---

## Batch processing

`batch <file>` reads a text file and runs each line as a terminal command, in order. Blank lines and comments (`REM`, `::`, `#`) are skipped. You can chain commands on one line with `&&`.

Example — create and run a batch file:

```
touch startup.bat
edit startup.bat
> clear
> sysinfo
> tree
> os new basic && boot
> :wq
batch startup.bat
```

You can also chain inline at the prompt:

```
clear && sysinfo && snake
```

---

## Commands

### System

| Command | Description |
|---|---|
| `help` | List all commands grouped by category |
| `clear` (or `cls`) | Wipe the screen |
| `echo <text>` | Print text back |
| `time` / `date` | Show the current time / full date |
| `whoami` | Print the current user (`jack`) |
| `history` | List previously typed commands |
| `sysinfo` | Fake OS info: version, kernel, CPU, memory, uptime |
| `uptime` | How long the fake OS has been "running" |
| `theme <name>` | Switch colors. Names: `green`, `amber`, `hacker`, `crosh`, `dos`, `anime` (app) / `dark`, `green`, `amber` (standalone) |
| `alias <n>=<cmd>` | Create a custom command shortcut |

### Files / DOS

| Command | Description |
|---|---|
| `dir` / `ls` | Flat list of files and folders in the current directory |
| `tree` | **Tree view** of the whole virtual filesystem from the current directory, with `├──`/`└──` branch characters and `/` on folders |
| `cd <dir>` | Change directory (`cd ~` goes home) |
| `pwd` | Print the current directory path |
| `type <file>` / `cat <file>` | Print a file's contents |
| `mkdir <name>` | Create a folder |
| `touch <file>` | Create an empty file |
| `del <file>` / `rm <file>` | Delete a file |
| `copy <a> <b>` / `cp` | Duplicate a file |
| `rename <old> <new>` / `mv` | Rename a file or folder |
| `edit <file>` | Open the line-based editor (`:wq` to save) |

The virtual file system is persisted to `localStorage`, so your files survive reloads.

### Crosh / Network

| Command | Description |
|---|---|
| `ping <addr>` | Animated fake ping (4 packets) |
| `trace <addr>` | Fake traceroute through several hops |
| `top` | Fake process list |
| `network_diag` | Pretend network test with throughput |
| `battery_test` | Random battery health stats |
| `crypto <sym>` | **Real** price from the CoinGecko API (e.g. `crypto bitcoin`) |
| `weather <city>` | **Real** weather from wttr.in (e.g. `weather Tokyo`) |

### Fun / Visual

| Command | Description |
|---|---|
| `matrix` | Green falling-code canvas animation (press any key to exit) |
| `hack <target>` | Animated "hacking" sequence |
| `ascii <text>` | Big ASCII-art text |
| `glitch` | Short glitch animation |
| `snake` | **Hidden** command (not in `help`) — launches a playable Snake game inside the terminal (WASD/arrows, Esc to quit) |
| `calc <expr>` | Safe arithmetic: `calc (2+3)*4` |
| `gojo` / `sukuna` | JJK quotes |
| `domain_expand` | Animated domain-expansion sequence |
| `curse_energy` | Random cursed-energy meter |
| `music` / `ost` | Synthesized terminal/anime themes (app version) |

### OS & script building

| Command | Description |
|---|---|
| `os new <template>` | Scaffold `index.html` + `style.css` + `main.js` |
| `boot` | Run the current folder's HTML/CSS/JS together in a sandbox window |
| `shutdown` | Close **all** sandboxed runtime windows |
| `run <file.js \| file.html \| file.css \| js>` | Execute an authored script/app file by name, or inline JavaScript |
| `url <addr>` | Open a URL in a sandboxed iframe window (`browser` is an alias) |
| `batch <file>` | Run a file of commands in sequence (supports `&&` chaining and `REM`/`::`/`#` comments) |
| `chatbot <msg>` | Talk to TERMINA, the built-in rule-based bot |

### Modes (Roblox / VRChat / Sandbox)

| Command | Description |
|---|---|
| `rbx-install <pkg>` | Fake Roblox package install |
| `rbx-avatar` | ASCII Roblox-style avatar preview |
| `rbx-run <game>` | Launch a mini-game (launches Snake) |
| `vrc-avatar <name>` | ASCII VRChat avatar |
| `shader-compile` | Fake shader compile logs |
| `vpm-install <pkg>` | Fake VRChat package install |
| `spawn <obj>` | Spawn a sandbox object |
| `explode <n>` | Explosion animation |
| `gravity <v>` | Set sandbox gravity |
| `simulate` | Run a short physics simulation log |

### Meta

| Command | Description |
|---|---|
| `sudo <cmd>` | Run a command with "elevated" permission (accepted by default) |
| `reboot` | Re-run the boot sequence |
| `exit` | …there is no escape. |

**Navigation:** `↑` / `↓` cycle command history; `Tab` autocompletes command names and files in the current directory; `&&` chains commands on one line.

---

## Advanced features

- **Login window** — fixed credentials (`admin` / `dos2026`) in a top-corner window before the shell.
- **Boot sequence** — classic MS-DOS POST, HIMEM memory check, hardware detection (CPU, disk, CD-ROM, network, mouse, display), driver load, then the prompt.
- **Virtual file system** — nested objects for directories and files, persisted to `localStorage`.
- **Tree view** — `tree` renders the whole filesystem as an indented directory tree.
- **Batch processing** — `batch <file>` runs a script of commands; `&&` chains inline.
- **Multi-window runtime** — each `boot` / `run <html>` / `run <css>` / `url` opens a separate floating sandboxed iframe; run many apps side-by-side while the terminal keeps working.
- **`run` dispatch** — `.js` executes JavaScript, `.html` boots a page (auto-injecting sibling CSS/JS), `.css` previews a stylesheet, inline runs JS expressions/statements.
- **URL iframes** — `url <addr>` opens any address in its own sandboxed window.
- **Hidden Snake** — `snake` launches a canvas game inside the terminal (not listed in `help`).
- **Command history** — full ↑/↓ navigation plus a `history` command.
- **Tab completion** — completes command names, then files in the current directory.
- **Raw MS-DOS look** — blocky, no glow, no CRT flicker, no animations on static text; just a blinking block cursor and a scrollable buffer.

---

## File map

```
README.md                         this file (includes login credentials)

src/
  pages/Terminal.jsx               main terminal page (login gate, multi-window runtime)
  components/terminal/
    LoginWindow.jsx                top-corner login window
    BootSequence.jsx               MS-DOS boot sequence
    SnakeGame.jsx                  canvas Snake game
    OsFrame.jsx                    floating sandboxed runtime window
  lib/terminal/
    themes.js                      theme definitions
    vfs.js                         virtual file system helpers
    commands.js                    command registry + runtime
    sound.js                       Web Audio sound engine
  index.css                        raw MS-DOS terminal CSS
  App.jsx                          router (route "/")

public/standalone/                 pure HTML/CSS/JS GitHub version (all features mirrored)
  index.html                       login window + terminal
  style.css
  script.js
```

The standalone version is a single-page, dependency-free reimplementation of the same shell — login, boot sequence, command engine, virtual file system, terminal editor, tree, batch, url, multi-window sandboxed runtime, Snake, and `run` dispatch — written in plain JavaScript so it can be hosted anywhere without a build step.

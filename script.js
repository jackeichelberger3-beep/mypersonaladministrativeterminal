/* TerminalOS — standalone vanilla engine. Pure HTML/CSS/JS, no build step.
   Mirrors the Base44 app: login, MS-DOS boot, command registry, virtual file
   system, terminal editor, multi-window sandboxed runtime, Snake, tree, batch,
   url, and `run` dispatch for .js / .html / .css files. */

(function () {
  "use strict";

  // ===== Login =====
  var LOGIN_USER = "admin", LOGIN_PASS = "dos2026";
  var loginOverlay = document.getElementById("login-overlay");
  var loginForm = document.getElementById("login-form");
  var loginErr = document.getElementById("login-err");
  var loginUser = document.getElementById("login-user");
  var loginPass = document.getElementById("login-pass");
  var terminalEl = document.getElementById("terminal");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (loginUser.value.trim() === LOGIN_USER && loginPass.value === LOGIN_PASS) {
      loginOverlay.classList.add("hidden");
      terminalEl.classList.remove("hidden");
      boot();
      setTimeout(function () { input.focus(); }, 50);
    } else {
      loginErr.textContent = "Invalid credentials";
      loginPass.value = "";
    }
  });
  loginUser.focus();

  // ===== DOM refs =====
  var screen = document.getElementById("screen");
  var input = document.getElementById("cmd");
  var promptEl = document.getElementById("prompt");

  var USER = "jack", HOST = "terminalos";
  var cwd = ["home", "user"];
  var history = [];
  var histIdx = -1;
  var aliases = {};
  var editing = null; // { file, buffer }

  // ===== Virtual file system =====
  var fs = {
    type: "dir",
    children: {
      home: { type: "dir", children: { user: { type: "dir", children: {
        "readme.txt": { type: "file", content: "Welcome to TerminalOS.\nType 'help' for commands." },
      } } } },
    },
  };
  function load() { try { var raw = localStorage.getItem("terminalos.vfs.v3"); if (raw) fs = JSON.parse(raw); } catch (e) {} }
  function save() { try { localStorage.setItem("terminalos.vfs.v3", JSON.stringify(fs)); } catch (e) {} }
  function resolveNode(path) { var n = fs; for (var i = 0; i < path.length; i++) { if (!n || n.type !== "dir" || !n.children[path[i]]) return null; n = n.children[path[i]]; } return n; }
  function resolvePath(p) {
    var parts; if (p.charAt(0) === "/") { parts = []; p = p.slice(1); } else parts = cwd.slice();
    p.split("/").forEach(function (s) { if (!s || s === ".") return; if (s === "..") parts.pop(); else parts.push(s); });
    return parts;
  }
  function pathLabel(p) { return "/" + p.join("/"); }
  function parentOf(p) { return p.slice(0, -1); }
  function baseOf(p) { return p[p.length - 1]; }

  // ===== Output =====
  function print(t) { append(String(t)); }
  function printHTML(html) { var d = document.createElement("div"); d.className = "line"; d.innerHTML = html; screen.appendChild(d); scroll(); }
  function append(t) { var d = document.createElement("div"); d.className = "line"; d.textContent = t; screen.appendChild(d); scroll(); }
  function scroll() { screen.scrollTop = screen.scrollHeight; }
  function clear() { screen.innerHTML = ""; }
  function setPrompt() { promptEl.textContent = USER + "@" + HOST + ":" + pathLabel(cwd) + "$"; }

  // ===== Floating runtime windows =====
  var winCount = 0;
  function openWindow(opts) {
    var w = document.createElement("div");
    w.className = "os-win";
    w.style.left = (40 + (winCount % 4) * 380) + "px";
    w.style.top = (60 + Math.floor(winCount / 4) * 320) + "px";
    winCount++;
    var bar = document.createElement("div");
    bar.className = "titlebar";
    bar.innerHTML = '<span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span class="title">' + (opts.title || "user-os") + '</span><span class="actions"></span>';
    var frame = document.createElement("iframe");
    if (opts.srcdoc != null) { frame.srcdoc = opts.srcdoc; frame.sandbox = "allow-scripts"; }
    else { frame.src = opts.src; frame.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups"; }
    var actions = bar.querySelector(".actions");
    var restartBtn = document.createElement("button"); restartBtn.className = "os-btn"; restartBtn.textContent = "restart";
    var closeBtn = document.createElement("button"); closeBtn.className = "os-btn"; closeBtn.textContent = "close";
    restartBtn.onclick = function () { if (opts.srcdoc != null) frame.srcdoc = opts.srcdoc; else frame.src = opts.src; };
    closeBtn.onclick = function () { if (w.parentNode) w.parentNode.removeChild(w); input.focus(); };
    bar.querySelector(".dot.red").style.cursor = "pointer"; bar.querySelector(".dot.red").onclick = closeBtn.onclick;
    bar.querySelector(".dot.yellow").style.cursor = "pointer"; bar.querySelector(".dot.yellow").onclick = restartBtn.onclick;
    actions.appendChild(restartBtn); actions.appendChild(closeBtn);
    w.appendChild(bar); w.appendChild(frame);
    document.body.appendChild(w);
  }
  function closeAllWindows() { document.querySelectorAll(".os-win").forEach(function (w) { w.parentNode.removeChild(w); }); }

  function bootOS(doc, title) { openWindow({ srcdoc: doc, title: title || "user-os" }); }
  function openUrl(url) { openWindow({ src: url, title: url }); }

  // ===== Snake game =====
  function startSnake() {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px";
    var hud = document.createElement("div");
    hud.style.cssText = "color:#c0c0c0;font-family:'Courier New',monospace;font-size:13px";
    hud.textContent = "SNAKE - score: 0   (WASD/arrows, Esc to quit)";
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "border:1px solid #c0c0c0;image-rendering:pixelated;max-width:92vw;max-height:70vh";
    overlay.appendChild(hud); overlay.appendChild(canvas); document.body.appendChild(overlay);
    var size = 20, cols = 28, rows = 20;
    canvas.width = cols * size; canvas.height = rows * size;
    var c = canvas.getContext("2d");
    var snake = [{ x: 14, y: 10 }], dir = { x: 1, y: 0 }, nd = dir, food = { x: 5, y: 5 }, score = 0, dead = false, raf;
    function place() { food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; }
    place();
    function draw() {
      c.fillStyle = "#000"; c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = "#ff5f56"; c.fillRect(food.x * size + 3, food.y * size + 3, size - 6, size - 6);
      c.fillStyle = "#c0c0c0";
      snake.forEach(function (s, i) { c.globalAlpha = i === 0 ? 1 : 0.7; c.fillRect(s.x * size + 1, s.y * size + 1, size - 2, size - 2); });
      c.globalAlpha = 1;
    }
    function step() {
      dir = nd; var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some(function (s) { return s.x === head.x && s.y === head.y; })) { dead = true; draw(); hud.textContent = "GAME OVER - score " + score + "  [Enter] to exit"; return; }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; hud.textContent = "SNAKE - score: " + score + "   (WASD/arrows, Esc to quit)"; place(); } else snake.pop();
      draw(); if (!dead) raf = setTimeout(step, 110);
    }
    function cleanup() { clearTimeout(raf); window.removeEventListener("keydown", onKey); if (overlay.parentNode) overlay.parentNode.removeChild(overlay); input.focus(); }
    function onKey(e) {
      var k = e.key.toLowerCase();
      if (k === "escape") { cleanup(); return; }
      if (dead) { if (k === "enter" || k === " ") cleanup(); return; }
      if ((k === "arrowup" || k === "w") && dir.y !== 1) nd = { x: 0, y: -1 };
      else if ((k === "arrowdown" || k === "s") && dir.y !== -1) nd = { x: 0, y: 1 };
      else if ((k === "arrowleft" || k === "a") && dir.x !== 1) nd = { x: -1, y: 0 };
      else if ((k === "arrowright" || k === "d") && dir.x !== -1) nd = { x: 1, y: 0 };
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    draw(); raf = setTimeout(step, 110);
  }

  // ===== Templates =====
  var TEMPLATES = {
    basic: { html: "<h1>Hello from my OS</h1><button onclick=alert('hi')>click</button>", css: "body{font-family:monospace;background:#111;color:#0f0;padding:20px}", js: "console.log('os loaded')" },
    neon: { html: "<h1>NEON OS</h1>", css: "body{background:#05000f;color:#0ff;font-family:monospace;padding:20px}h1{text-shadow:0 0 20px #0ff}", js: "" },
    hacker: { html: "<pre id=log></pre>", css: "body{background:#000;color:#0f0}#log{white-space:pre-wrap}", js: "var l=document.getElementById('log');setInterval(function(){l.textContent+='\\naccessing...';},400)" },
    anime: { html: "<h1>領域展開</h1>", css: "body{background:#0a0014;color:#c061ff;font-family:sans-serif;text-align:center;padding-top:30vh}h1{text-shadow:0 0 30px #c061ff}", js: "" },
  };

  // ===== Commands =====
  var commands = {};
  commands.help = function () {
    print("TerminalOS commands:");
    print("  System:  help clear echo time date whoami history sysinfo uptime theme alias");
    print("  Files:   dir ls tree cd pwd type cat mkdir touch del copy rename edit");
    print("  Net:     ping trace top network_diag battery_test crypto weather");
    print("  Fun:     matrix hack ascii glitch calc gojo sukuna domain_expand curse_energy");
    print("  OS/Dev:  os new <basic|neon|hacker|anime>  boot  shutdown  run <file|js>  url <addr>  batch <file>  chatbot");
    print("  Modes:   rbx-install rbx-avatar vrc-avatar shader-compile spawn explode gravity");
    print("  Meta:    sudo reboot exit  (↑↓ history, Tab complete, && chain)");
  };
  commands.clear = commands.cls = function () { clear(); };
  commands.echo = function (a) { print(a.join(" ")); };
  commands.time = function () { print(new Date().toLocaleTimeString()); };
  commands.date = function () { print(new Date().toString()); };
  commands.whoami = function () { print(USER); };
  commands.history = function () { history.forEach(function (h, i) { print((i + 1) + "  " + h); }); };
  commands.sysinfo = function () { print("OS: TerminalOS 1.0 (Curiosity)\nKernel: webkernel 5.1.4\nCPU: Virtual CPU @ 3.4GHz (4 cores)\nMemory: 8192 MB\nUptime: " + uptime()); };
  commands.uptime = function () { print("up " + uptime()); };
  commands.theme = function (a) {
    var themes = { dark: { fg: "#c0c0c0", dim: "#707070", bg: "#000" }, green: { fg: "#33ff66", dim: "#1f8c3f", bg: "#020a02" }, amber: { fg: "#ffb000", dim: "#9c6a00", bg: "#120a00" } };
    var t = themes[a[0]];
    if (!t) { print("themes: dark, green, amber"); return; }
    document.documentElement.style.setProperty("--fg", t.fg);
    document.documentElement.style.setProperty("--dim", t.dim);
    document.documentElement.style.setProperty("--bg", t.bg);
    document.documentElement.style.setProperty("--cursor", t.fg);
    print("theme: " + a[0]);
  };
  commands.alias = function (a) { var m = a.join(" ").match(/^(\w+)\s*=\s*(.+)$/); if (!m) { print("usage: alias name=command"); return; } aliases[m[1]] = m[2]; print("alias " + m[1] + "='" + m[2] + "'"); };

  commands.pwd = function () { print(pathLabel(cwd)); };
  commands.dir = commands.ls = function () {
    var n = resolveNode(cwd); if (!n || n.type !== "dir") return print("not a dir");
    var keys = Object.keys(n.children);
    if (!keys.length) return print("(empty)");
    print("  Directory of " + pathLabel(cwd));
    keys.forEach(function (k) { print((n.children[k].type === "dir" ? "  [DIR]  " : "         ") + k); });
  };
  commands.tree = function () {
    var root = resolveNode(cwd); if (!root || root.type !== "dir") return print("not a directory");
    var out = [pathLabel(cwd)];
    function rec(node, prefix) {
      Object.keys(node.children).forEach(function (k, i) {
        var last = i === Object.keys(node.children).length - 1;
        var child = node.children[k];
        out.push(prefix + (last ? "└── " : "├── ") + k + (child.type === "dir" ? "/" : ""));
        if (child.type === "dir") rec(child, prefix + (last ? "    " : "│   "));
      });
    }
    rec(root, "");
    var pre = document.createElement("pre"); pre.className = "ascii line"; pre.textContent = out.join("\n");
    screen.appendChild(pre); scroll();
  };
  commands.cd = function (a) {
    if (!a[0] || a[0] === "~") { cwd = ["home", "user"]; setPrompt(); return; }
    var t = resolvePath(a[0]); var n = resolveNode(t);
    if (!n) return print("cd: no such directory: " + a[0]);
    if (n.type !== "dir") return print("cd: not a directory: " + a[0]);
    cwd = t; setPrompt();
  };
  commands.type = commands.cat = function (a) {
    if (!a[0]) return print("usage: type <file>");
    var n = resolveNode(resolvePath(a[0]));
    if (!n) return print("file not found: " + a[0]);
    if (n.type === "dir") return print(a[0] + " is a directory");
    print(n.content || "");
  };
  commands.mkdir = function (a) { if (!a[0]) return print("usage: mkdir <name>"); var p = resolveNode(cwd); if (p.children[a[0]]) return print("mkdir: exists"); p.children[a[0]] = { type: "dir", children: {} }; save(); print("directory created: " + a[0]); };
  commands.touch = function (a) { if (!a[0]) return print("usage: touch <file>"); var p = resolveNode(cwd); if (!p.children[a[0]]) p.children[a[0]] = { type: "file", content: "" }; save(); print("touched " + a[0]); };
  commands.del = commands.rm = function (a) { if (!a[0]) return print("usage: del <file>"); var t = resolvePath(a[0]); var p = resolveNode(parentOf(t)); var name = baseOf(t); if (!p || !p.children[name]) return print("del: not found: " + a[0]); delete p.children[name]; save(); print("deleted " + a[0]); };
  commands.copy = commands.cp = function (a) { if (a.length < 2) return print("usage: copy <src> <dst>"); var src = resolveNode(resolvePath(a[0])); if (!src || src.type !== "file") return print("copy: not a file"); resolveNode(cwd).children[a[1]] = { type: "file", content: src.content }; save(); print("copied " + a[0] + " -> " + a[1]); };
  commands.rename = commands.mv = function (a) { if (a.length < 2) return print("usage: rename <old> <new>"); var p = resolveNode(cwd); if (!p.children[a[0]]) return print("rename: not found"); p.children[a[1]] = p.children[a[0]]; delete p.children[a[0]]; save(); print("renamed " + a[0] + " -> " + a[1]); };
  commands.edit = function (a) {
    if (!a[0]) return print("usage: edit <file>");
    editing = { file: a[0], buffer: [] };
    print("--- EDITING " + a[0] + " ---");
    print("Type your content. Enter :wq on its own line to save, :q to discard.");
  };

  commands.ping = function (a) {
    var addr = a[0] || "localhost"; print("PING " + addr); var i = 0;
    var t = setInterval(function () { print("64 bytes from " + addr + ": icmp_seq=" + i + " time=" + (Math.random() * 40 + 5).toFixed(1) + " ms"); if (++i >= 4) clearInterval(t); }, 500);
  };
  commands.trace = function (a) {
    var addr = a[0] || "8.8.8.8"; var hops = ["10.0.0.1", "172.16.0.1", "192.168.1.1", "isp.net", addr]; var i = 0; print("traceroute to " + addr);
    var t = setInterval(function () { print(" " + (i + 1) + "  " + hops[i] + "  " + (Math.random() * 80 + 2).toFixed(1) + " ms"); if (++i >= hops.length) clearInterval(t); }, 450);
  };
  commands.top = function () { print("PID  CPU%  CMD\n1    0.1   init\n42   2.4   shell\n103  11.7  matrix-render"); };
  commands.network_diag = function () { print("interface eth0 OK\ndns OK\nthroughput 940/420 Mbps\ndiagnostics passed"); };
  commands.battery_test = function () { print("Battery " + (Math.floor(Math.random() * 40 + 60)) + "%\nHealth " + (Math.floor(Math.random() * 15 + 85)) + "%"); };
  commands.crypto = function (a) {
    var sym = a[0] || "bitcoin"; print("fetching " + sym + "...");
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(sym) + "&vs_currencies=usd")
      .then(function (r) { return r.json(); })
      .then(function (d) { print(sym + ": $" + (d[sym] ? d[sym].usd.toLocaleString() : "n/a") + " USD"); })
      .catch(function () { print("network error"); });
  };
  commands.weather = function (a) {
    var city = a.join(" ") || "Tokyo"; print("fetching weather for " + city + "...");
    fetch("https://wttr.in/" + encodeURIComponent(city) + "?format=%l:+%C+%t+%h+%w")
      .then(function (r) { return r.text(); })
      .then(function (t) { print(t.trim() || "no data"); })
      .catch(function () { print("network error"); });
  };

  commands.matrix = function () {
    var ov = document.createElement("canvas");
    ov.style.cssText = "position:fixed;inset:0;z-index:60;background:#000";
    document.body.appendChild(ov);
    ov.width = window.innerWidth; ov.height = window.innerHeight;
    var c = ov.getContext("2d"), cols = Math.floor(ov.width / 14), drops = Array(cols).fill(1);
    var chars = "アァカサタナハ0123456789ABCDEF".split("");
    var raf; function stop() { cancelAnimationFrame(raf); if (ov.parentNode) ov.parentNode.removeChild(ov); input.focus(); }
    function draw() { c.fillStyle = "rgba(0,0,0,0.08)"; c.fillRect(0, 0, ov.width, ov.height); c.fillStyle = "#33ff66"; c.font = "14px monospace"; for (var i = 0; i < drops.length; i++) { c.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, drops[i] * 14); if (drops[i] * 14 > ov.height && Math.random() > 0.975) drops[i] = 0; drops[i]++; } raf = requestAnimationFrame(draw); }
    draw(); print("matrix mode — press any key to exit");
    function exit() { stop(); window.removeEventListener("keydown", exit); window.removeEventListener("click", exit); }
    window.addEventListener("keydown", exit); window.addEventListener("click", exit);
  };
  commands.hack = function (a) { var lines = ["Initializing exploit...", "Targeting " + (a[0] || "mainframe"), "Bypassing firewall...", "Access granted."]; var i = 0; var t = setInterval(function () { print(lines[i]); if (++i >= lines.length) clearInterval(t); }, 420); };
  commands.ascii = function (a) { print("  " + (a.join(" ") || "TerminalOS").toUpperCase()); };
  commands.glitch = function () { print("signal glitch... stabilized"); };
  commands.snake = function () { print("launching snake... use WASD/arrows, Esc to quit."); startSnake(); };
  commands.calc = function (a) { var expr = a.join(" "); if (!/^[\d\s+\-*/().%]+$/.test(expr)) return print("calc: invalid"); try { print("= " + Function("return (" + expr + ")")()); } catch (e) { print("calc: error"); } };
  commands.gojo = function () { print("Throughout Heaven and Earth, I alone am the honored one."); };
  commands.sukuna = function () { print("Domain Expansion: Malevolent Shrine."); };
  commands.domain_expand = function () { print("DOMAIN EXPANSION: UNLIMITED VOID"); };
  commands.curse_energy = function () { var lvl = Math.floor(Math.random() * 60 + 40); print("CURSE ENERGY: " + lvl + "%"); };

  commands.os = function (a) {
    if (a[0] !== "new") return print("usage: os new <basic|neon|hacker|anime>");
    var tpl = TEMPLATES[a[1] || "basic"]; if (!tpl) return print("unknown template");
    var p = resolveNode(cwd);
    p.children["index.html"] = { type: "file", content: tpl.html };
    p.children["style.css"] = { type: "file", content: tpl.css };
    p.children["main.js"] = { type: "file", content: tpl.js };
    save(); print("scaffolded '" + (a[1] || "basic") + "' template. run 'boot'.");
  };
  commands.boot = function () {
    var p = resolveNode(cwd); if (!p || p.type !== "dir") return print("boot: no directory");
    var html = p.children["index.html"], css = p.children["style.css"], js = p.children["main.js"];
    if (!html) return print("boot: no index.html. try 'os new basic'");
    var doc = html.content || "<!-- empty -->";
    if (css) doc = doc.split("</head>").length > 1 ? doc.replace("</head>", "<style>" + (css.content || "") + "</style></head>") : doc;
    if (js) { var s = "<script>" + (js.content || "") + "<\/script>"; doc = doc.split("</body>").length > 1 ? doc.replace("</body>", s + "</body>") : doc + s; }
    bootOS(doc, "user-os"); print("booting user OS in sandbox...");
  };
  commands.shutdown = function () { closeAllWindows(); print("user OS shut down."); };
  commands.run = function (a) {
    var arg = a[0];
    if (!arg) return print("usage: run <file.js | file.html | file.css | inline js>");
    var targetPath = resolvePath(arg);
    var node = resolveNode(targetPath);
    if (node && node.type === "file") {
      if (/\.js$/i.test(arg)) {
        var code = node.content || ""; print("running " + arg + "...");
        try { var r; try { r = Function("return (" + code + ")")(); } catch (e) { if (!(e instanceof SyntaxError)) throw e; Function(code)(); r = undefined; } print(r === undefined ? "ok" : String(r)); }
        catch (e) { print("run: " + e.message); }
        return;
      }
      if (/\.html?$/i.test(arg)) {
        var parent = resolveNode(parentOf(targetPath));
        var doc = node.content || "<!-- empty -->";
        if (parent) {
          var css = parent.children["style.css"], js = parent.children["main.js"];
          if (css) doc = doc.split("</head>").length > 1 ? doc.replace("</head>", "<style>" + (css.content || "") + "</style></head>") : doc;
          if (js) { var s2 = "<script>" + (js.content || "") + "<\/script>"; doc = doc.split("</body>").length > 1 ? doc.replace("</body>", s2 + "</body>") : doc + s2; }
        }
        bootOS(doc, arg); print("booting " + arg + " in sandbox...");
        return;
      }
      if (/\.css$/i.test(arg)) {
        var preview = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>" + (node.content || "") + "</style></head><body><h1>CSS Preview: " + arg + "</h1><p>paragraph text</p><button>a button</button><div class='box'>.box</div></body></html>";
        bootOS(preview, arg); print("previewing " + arg + " in sandbox...");
        return;
      }
      print("run: unsupported file type: " + arg); return;
    }
    var inline = a.join(" "); if (!inline.trim()) return print("run: empty");
    try { var rr; try { rr = Function("return (" + inline + ")")(); } catch (e) { if (!(e instanceof SyntaxError)) throw e; Function(inline)(); rr = undefined; } print(rr === undefined ? "ok" : String(rr)); }
    catch (e) { print("run: " + e.message); }
  };
  commands.url = function (a) {
    if (!a[0]) return print("usage: url <address>");
    var url = a[0]; if (!/^https?:\/\//.test(url)) url = "https://" + url;
    openUrl(url); print("opening " + url + " in iframe (many sites block embedding)");
  };
  commands.browser = commands.url;
  commands.batch = function (a) {
    if (!a[0]) return print("usage: batch <file>");
    var node = resolveNode(resolvePath(a[0]));
    if (!node || node.type !== "file") return print("batch: " + a[0] + ": not found");
    var lines = (node.content || "").split("\n");
    var i = 0;
    (function next() {
      if (i >= lines.length) return;
      var line = lines[i++].trim();
      if (!line || /^(rem|::|#)/i.test(line)) { next(); return; }
      printHTML("<span class='dim'>></span> " + line);
      var parts = line.split("&&").map(function (s) { return s.trim(); }).filter(Boolean);
      var j = 0;
      (function runP() {
        if (j >= parts.length) { next(); return; }
        run(parts[j++].split(/\s+/), runP);
      })();
    })();
  };
  commands.chatbot = function (a) {
    var m = a.join(" ").toLowerCase();
    var r = m.indexOf("hello") !== -1 ? "Greetings, user." : m.indexOf("help") !== -1 ? "try: help, sysinfo, snake" : "echo: " + m + " — ask 'help' or 'time'.";
    print("TERMINA> " + r);
  };

  commands["rbx-install"] = function (a) { print("installed " + (a[0] || "roblox-runtime") + " ✓"); };
  commands["rbx-avatar"] = function () { print("[rbx] avatar ready (blocky edition)"); };
  commands["rbx-run"] = function () { startSnake(); };
  commands["vrc-avatar"] = function (a) { print("[vrc] avatar " + (a[0] || "avatar0") + " spawned"); };
  commands["shader-compile"] = function () { print("[vrc] shader compiled"); };
  commands["vpm-install"] = function (a) { print("[vrc] " + (a[0] || "vrc-sdk") + " installed ✓"); };
  commands.spawn = function (a) { print("spawned " + (a[0] || "cube")); };
  commands.explode = function (a) { print("explosion! radius " + (a[0] || 6) + "m"); };
  commands.gravity = function (a) { print("gravity set to " + (a[0] || 9.8) + " m/s^2"); };
  commands.simulate = function () { print("simulation paused."); };

  commands.sudo = function (a) { print("[sudo] password accepted"); if (a.length) run(a.join(" "), a); };
  commands.reboot = function () { clear(); closeAllWindows(); boot(); };
  commands.exit = function () { print("there is no escape from the terminal."); };

  function uptime() {
    if (!window.__bootTime) window.__bootTime = Date.now();
    var ms = Date.now() - window.__bootTime;
    return Math.floor(ms / 3600000) + "h " + Math.floor(ms / 60000) % 60 + "m " + Math.floor(ms / 1000) % 60 + "s";
  }

  function run(line, rawArgs) {
    var args = (rawArgs || line.split(/\s+/)).filter(Boolean);
    var name = args[0]; if (!name) return;
    if (aliases[name]) { run(aliases[name] + " " + args.slice(1).join(" ")); return; }
    var cmd = commands[name];
    if (!cmd) { print(name + ": command not found"); return; }
    try { var ret = cmd(args.slice(1)); if (ret !== undefined) print(String(ret)); } catch (e) { print("error: " + e.message); }
  }

  // ===== Input =====
  function commit() {
    var val = input.value;
    append((USER + "@" + HOST + ":" + pathLabel(cwd) + "$ ") + val);
    input.value = ""; histIdx = -1;
    var trimmed = val.trim();
    if (trimmed) { history.push(trimmed); execLine(trimmed); }
  }
  function execLine(line) {
    if (line.indexOf("&&") !== -1) {
      line.split("&&").map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (c) { run(c); });
    } else run(line);
  }
  input.addEventListener("keydown", function (e) {
    if (editing) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (input.value === ":wq") {
          var p = resolveNode(cwd); if (p && p.type === "dir") p.children[editing.file] = { type: "file", content: editing.buffer.join("\n") };
          save(); print("saved " + editing.file); editing = null;
        } else if (input.value === ":q") { print("discarded"); editing = null; }
        else { editing.buffer.push(input.value); print("> " + input.value); }
        input.value = "";
      }
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); commit(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (history.length) { if (histIdx === -1) histIdx = history.length; histIdx = Math.max(0, histIdx - 1); input.value = history[histIdx] || ""; } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (histIdx !== -1) { histIdx = Math.min(history.length, histIdx + 1); input.value = histIdx === history.length ? "" : history[histIdx] || ""; } return; }
    if (e.key === "Tab") {
      e.preventDefault();
      var parts = input.value.split(/\s+/);
      if (parts.length === 1) { var m = Object.keys(commands).filter(function (c) { return c.indexOf(parts[0]) === 0; }); if (m.length === 1) input.value = m[0] + " "; }
      else { var node = resolveNode(cwd); if (node && node.type === "dir") { var fm = Object.keys(node.children).filter(function (c) { return c.indexOf(parts[parts.length - 1]) === 0; }); if (fm.length === 1) { parts[parts.length - 1] = fm[0]; input.value = parts.join(" "); } } }
    }
  });
  document.addEventListener("click", function () { if (!editing) input.focus(); });

  // ===== Boot sequence (classic MS-DOS) =====
  function boot() {
    window.__bootTime = Date.now();
    var lines = [
      "TerminalOS BIOS v1.42",
      "",
      "Performing Power-On Self Test... OK",
      "",
      "HIMEM is testing extended memory... done.",
      "Microsoft(R) MS-DOS(R) compatible kernel 6.22",
      "        (C)Copyright Curiosity Systems 1981-2026",
      "",
      "Performing memory check:",
      "  Conventional memory:      640 KB",
      "  Extended (XMS) memory:   7,552 KB",
      "  Total memory:           8,192 KB  OK",
      "",
      "Detecting hardware:",
      "  CPU:       Virtual x86 @ 3.4GHz (4 cores)",
      "  Fixed disk 0:        4.0 GB  (C:)",
      "  CD-ROM drive:        D:",
      "  Network adapter:     VirtualNet 100/1000",
      "  Pointing device:     detected on COM1",
      "  Display adapter:     VGA 720x400 16-color",
      "",
      "Loading device drivers: HIMEM.SYS  EMM386.EXE  CRT.SYS",
      "Memory managers loaded.",
      "Mounting /dev/webdisk0... OK",
      "Initializing network stack... OK",
      "Loading user profile... OK",
      "",
      "Starting TerminalOS v1.0...",
      "",
    ];
    var i = 0;
    var t = setInterval(function () {
      if (i < lines.length) { append(lines[i]); i++; }
      else { clearInterval(t); setPrompt(); print("Type 'help' for commands."); }
    }, 140);
  }

  load();
})();

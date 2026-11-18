// NFL presentation mod: NFL team names / abbreviations, team logos (spr_nfl_logos),
// midfield logo and endzone team names. Loaded after RetroBowl.js, before mod-menu.js.
(function () {
  var LOGO_SPRITE = 205; // spr_nfl_logos, frame == team uid (see tools/nfl)
  // the logo art fits a 52x52 box inside each 64x64 frame (tools/retro/logos, built by
  // tools/retro/build_logos.py); scales below are worked out from that box
  var LOGO_W = 52, LOGO_H = 52;

  // uid: [old city name, NFL name, old abbreviation, NFL abbreviation]
  var TEAMS = [
    ["Buffalo", "Bills", "BUF", "BUF"], ["Miami", "Dolphins", "MIA", "MIA"],
    ["New England", "Patriots", "N.E", "NE"], ["New York J", "Jets", "NYJ", "NYJ"],
    ["Denver", "Broncos", "DEN", "DEN"], ["Kansas City", "Chiefs", "K.C", "KC"],
    ["Los Angeles C", "Chargers", "LAC", "LAC"], ["Las Vegas", "Raiders", "L.V", "LV"],
    ["Baltimore", "Ravens", "BAL", "BAL"], ["Cincinnati", "Bengals", "CIN", "CIN"],
    ["Cleveland", "Browns", "CLE", "CLE"], ["Pittsburgh", "Steelers", "PIT", "PIT"],
    ["Houston", "Texans", "HOU", "HOU"], ["Indianapolis", "Colts", "IND", "IND"],
    ["Jacksonville", "Jaguars", "JAC", "JAX"], ["Tennessee", "Titans", "TEN", "TEN"],
    ["Dallas", "Cowboys", "DAL", "DAL"], ["New York G", "Giants", "NYG", "NYG"],
    ["Philadelphia", "Eagles", "PHI", "PHI"], ["Washington", "Commanders", "WAS", "WAS"],
    ["Arizona", "Cardinals", "ARI", "ARI"], ["Los Angeles R", "Rams", "LAR", "LAR"],
    ["San Francisco", "49ers", "S.F", "SF"], ["Seattle", "Seahawks", "SEA", "SEA"],
    ["Chicago", "Bears", "CHI", "CHI"], ["Detroit", "Lions", "DET", "DET"],
    ["Green Bay", "Packers", "G.B", "GB"], ["Minnesota", "Vikings", "MIN", "MIN"],
    ["Atlanta", "Falcons", "ATL", "ATL"], ["Carolina", "Panthers", "CAR", "CAR"],
    ["New Orleans", "Saints", "N.O", "NO"], ["Tampa Bay", "Buccaneers", "T.B", "TB"]
  ];

  var nameToUid = {};
  TEAMS.forEach(function (t, uid) {
    nameToUid[t[1].toUpperCase()] = uid;
    nameToUid[t[0].toUpperCase()] = uid;
    nameToUid[(t[0] + " " + t[1]).toUpperCase()] = uid;
  });

  // ---------- save migration: rename teams inside existing saves ----------
  // GameMaker ds_map hex: u32 version, u32 count, then key/value pairs where each
  // value is u32 type (0 = f64 real, 1 = u32 length + utf8 string).
  function hexToBytes(h) {
    var b = new Uint8Array(h.length / 2);
    for (var i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16);
    return b;
  }
  function bytesToHex(b) {
    var s = "";
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? "0" : "") + b[i].toString(16).toUpperCase();
    return s;
  }
  function decodeMap(hex) {
    var b = hexToBytes(hex), dv = new DataView(b.buffer), p = 8, out = [];
    var n = dv.getUint32(4, true);
    function val() {
      var type = dv.getUint32(p, true); p += 4;
      if (type === 0) { var r = dv.getFloat64(p, true); p += 8; return { t: 0, v: r }; }
      if (type === 1) {
        var len = dv.getUint32(p, true); p += 4;
        var str = new TextDecoder().decode(b.subarray(p, p + len)); p += len;
        return { t: 1, v: str };
      }
      throw new Error("unsupported ds_map value type " + type);
    }
    for (var i = 0; i < n; i++) out.push([val(), val()]);
    return { version: dv.getUint32(0, true), entries: out };
  }
  function encodeMap(m) {
    var parts = [], enc = new TextEncoder();
    function u32(x) { var a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, x, true); parts.push(a); }
    function val(v) {
      u32(v.t);
      if (v.t === 0) { var a = new Uint8Array(8); new DataView(a.buffer).setFloat64(0, v.v, true); parts.push(a); }
      else { var s = enc.encode(v.v); u32(s.length); parts.push(s); }
    }
    u32(m.version); u32(m.entries.length);
    m.entries.forEach(function (e) { val(e[0]); val(e[1]); });
    var len = parts.reduce(function (a, p) { return a + p.length; }, 0), out = new Uint8Array(len), o = 0;
    parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return bytesToHex(out);
  }

  function migrateTeamMap(hex) {
    var m = decodeMap(hex), get = {};
    m.entries.forEach(function (e) { get[e[0].v] = e[1]; });
    var uid = get.uid ? Number(get.uid.v) : -1, t = TEAMS[uid];
    if (!t) return hex;
    var changed = false;
    if (get.name && get.name.v === t[0]) { get.name.v = t[1]; changed = true; }
    if (get.tla && get.tla.v === t[2]) { get.tla.v = t[3]; changed = true; }
    return changed ? encodeMap(m) : hex;
  }

  function migrateSave(key) {
    var ini = localStorage.getItem(key);
    if (!ini || ini.indexOf("teamlist_0=") === -1) return;
    var changed = false;
    var next = ini.replace(/(teamlist_\d+=")([0-9A-Fa-f]+)(")/g, function (all, a, hex, c) {
      try {
        var h = migrateTeamMap(hex);
        if (h !== hex) { changed = true; return a + h + c; }
      } catch (err) {}
      return all;
    });
    if (changed) localStorage.setItem(key, next);
  }
  try {
    ["RetroBowl.0.savedata.ini", "RetroBowlModded.0.savedata.ini"].forEach(migrateSave);
  } catch (err) {}

  // ---------- real NFL rosters ----------
  // Madden position -> Retro Bowl position code
  var POS = { QB: 1, HB: 2, FB: 2, TE: 3, WR: 4, LT: 5, LG: 5, C: 5, RG: 5, RT: 5,
    DT: 6, LEDG: 6, REDG: 6, MIKE: 7, WILL: 7, SAM: 7, CB: 8, FS: 9, SS: 9, K: 10 };
  // per Retro Bowl position: attribute caps [speed, strength, skill, stamina] and the
  // divisor the game uses for its star rating (stars = round(sum / div * 10), 10 = 5 stars)
  var CAPS = { 1: [7, 10, 10, 10, 37], 2: [10, 9, 6, 10, 34], 3: [7, 8, 8, 10, 33],
    4: [10, 6, 10, 8, 34], 5: [5, 10, 10, 10, 35], 6: [5, 10, 10, 10, 35],
    7: [7, 8, 8, 10, 33], 8: [9, 6, 8, 10, 33], 9: [9, 6, 8, 10, 33], 10: [7, 10, 10, 10, 37] };
  // the user's roster (game limit is 10): each team's #1 at every position group
  var LINEUP = [["QB"], ["HB"], ["WR"], ["TE"], ["LT", "LG", "C", "RG", "RT"],
    ["DT", "LEDG", "REDG"], ["MIKE", "WILL", "SAM"], ["CB"], ["FS", "SS"], ["K"]];

  // Madden overall -> Retro Bowl rating in half stars (1..10)
  function starsFromOvr(ovr) {
    var cuts = [97, 93, 89, 85, 81, 77, 73, 69, 64];
    for (var i = 0; i < cuts.length; i++) if (ovr >= cuts[i]) return 10 - i;
    return 1;
  }
  // potential: young players and Superstar / X-Factor dev traits have room to grow
  function potentialStars(p, cur) {
    var bonus = p.age <= 23 ? 3 : p.age <= 25 ? 2 : p.age <= 27 ? 1 : 0;
    if (p.dev !== "N" && p.age < 30) bonus += 1;
    return Math.min(10, cur + bonus);
  }
  function rating(a, div) { return Math.max(1, Math.min(10, Math.round((a[0] + a[1] + a[2] + a[3]) / div * 10))); }

  // build [speed, strength, skill, stamina] hitting the target rating; speed follows Madden SPD.
  // With `from`, grow those attributes (never shrink them) to reach a higher potential.
  function attributesFor(code, target, spd, from) {
    var c = CAPS[code], div = c[4];
    var a = from ? from.slice() : [
      Math.max(1, Math.min(c[0], Math.round((spd - 60) / 36 * c[0]))),
      Math.max(1, Math.round(c[1] / 2)), Math.max(1, Math.round(c[2] / 2)), Math.max(1, Math.round(c[3] * 0.7))];
    var up = from ? [2, 1, 3, 0] : [2, 1, 3], down = from ? [] : [3, 1, 2];
    for (var guard = 0; guard < 80; guard++) {
      var r = rating(a, div);
      if (r === target) break;
      var order = r < target ? up : down, d = r < target ? 1 : -1, best = -1, bestRoom = 0;
      order.forEach(function (i) {
        var room = d > 0 ? c[i] - a[i] : a[i] - 1;
        if (room > bestRoom) { best = i; bestRoom = room; }
      });
      if (best < 0) {
        // last resort: move speed
        if (d > 0 && a[0] < c[0]) { a[0]++; continue; }
        if (d < 0 && !from && a[0] > 1) { a[0]--; continue; }
        break;
      }
      a[best] += d;
    }
    return a;
  }

  function applyRealPlayer(g, map, p) {
    var code = POS[p.pos];
    var cur = starsFromOvr(p.ovr), pot = potentialStars(p, cur);
    var a = attributesFor(code, cur, p.spd);
    var m = attributesFor(code, pot, p.spd, a);
    var set = function (k, v) { _Yi(map, k, v); };
    set("fname", p.fn); set("lname", p.ln); set("position", code);
    set("age", p.age);
    set("speed", a[0]); set("strength", a[1]); set("skill", a[2]); set("stamina", a[3]);
    set("max_speed", m[0]); set("max_strength", m[1]); set("max_skill", m[2]); set("max_stamina", m[3]);
    set("xp_level", Math.max(1, Math.min(9, p.age - 21)));
    set("condition", 100); set("injury_week", 0);
    set("attitude", p.dev === "X" ? 95 : p.dev === "S" ? 85 : 70);
    set("salary", _MJ(g, g, map));
    set("nfl", 1);
  }

  function rosterFor(uid) {
    var list = (window.NFL_ROSTERS || [])[uid] || [], used = {}, picks = [];
    LINEUP.forEach(function (group) {
      for (var i = 0; i < list.length; i++) {
        if (!used[i] && group.indexOf(list[i].pos) >= 0 && POS[list[i].pos]) { used[i] = 1; picks.push(list[i]); return; }
      }
    });
    return picks;
  }

  function globalObj() {
    var all = _si(64);
    for (var k in all) if (Object.prototype.hasOwnProperty.call(all, k)) return all[k];
    return null;
  }

  function installRealRoster(force) {
    var g = globalObj();
    if (!g || !window.NFL_ROSTERS) return;
    var picks = rosterFor(Number(g._Ip));
    if (!picks.length) return;
    var old = g._Ln, keep = [], current = 0;
    for (var j = 0; j < _wi(old); j++) {
      var q = _zi(old, j);
      if (Number(_Ai(q, "nflteam")) === Number(g._Ip)) current++;
    }
    if (current >= picks.length && force !== true) return; // already this team's real roster
    for (var i = 0; i < _wi(old); i++) {
      var pm = _zi(old, i);
      if (Number(_Ai(pm, "hof")) === 1) keep.push(pm); else _fq(pm);
    }
    _bj(old);
    g._Ln = _4j();
    keep.forEach(function (pm) { _8j(g._Ln, pm); });
    picks.forEach(function (p) {
      var map = _zH(g, g, POS[p.pos], p.age, 2, 4);
      _Yi(map, "signed_year", -1);
      _Yi(map, "teamid", g._Ip);
      if (Number(_Ai(map, "contract")) < 2) _Yi(map, "contract", 2);
      applyRealPlayer(g, map, p);
      _Yi(map, "nflteam", g._Ip);
      _8j(g._Ln, map);
    });
    // real stars cost more than generated players; keep the team under the salary cap
    var cap = Number(g._7t) || 150, total = 0, n = _wi(g._Ln);
    for (var k = 0; k < n; k++) total += Number(_Ai(_zi(g._Ln, k), "salary")) || 0;
    if (total > cap * 0.9) {
      for (var k2 = 0; k2 < n; k2++) {
        var sm = _zi(g._Ln, k2);
        _Yi(sm, "salary", Math.max(1, Math.floor(Number(_Ai(sm, "salary")) * cap * 0.9 / total)));
      }
    }
  }

  // trade offers: swap each generated player for a real player from the offering team
  function realTradeList() {
    var g = globalObj();
    if (!g || !window.NFL_ROSTERS) return;
    var taken = {};
    [g._Ln, g._vt].forEach(function (l) {
      for (var i = 0; i < _wi(l); i++) { var pm = _zi(l, i); taken[_Ai(pm, "fname") + " " + _Ai(pm, "lname")] = 1; }
    });
    for (var i = 0; i < _wi(g._vt); i++) {
      var pm = _zi(g._vt, i);
      if (Number(_Ai(pm, "nfl")) === 1) continue;
      var team = (NFL_ROSTERS[Number(_Ai(pm, "teamid"))] || []).filter(function (p) {
        return POS[p.pos] && !taken[p.fn + " " + p.ln];
      }).slice(0, 15);
      if (!team.length) continue;
      var p = team[Math.floor(Math.random() * team.length)];
      taken[p.fn + " " + p.ln] = 1;
      applyRealPlayer(g, pm, p);
    }
  }

  function after(name, fn) {
    var orig = window[name];
    if (typeof orig !== "function") return;
    window[name] = function () {
      var r = orig.apply(this, arguments);
      try { fn(); } catch (e) { console.log("NFLMOD " + name + " " + e.stack); }
      return r;
    };
  }
  // mod menu: replace the current save's roster with the user's team's real players
  var rosterBtn = document.getElementById("a-nfl-roster");
  if (rosterBtn) rosterBtn.onclick = function () {
    var g = globalObj();
    if (!g || !g._Ln) { alert("Start a career first."); return; }
    if (typeof _6L === "function" && _6L(71)) { alert("Finish the current game first."); return; }
    if (!confirm("Replace your whole roster with the real NFL players for your team? This cannot be undone.")) return;
    try {
      installRealRoster(true);
      __j(g, g); // s_savegame
      alert("Roster replaced with real NFL players. Reloading...");
      location.reload();
    } catch (e) { alert("Could not load the roster: " + e.message); }
  };

  // mod menu: device / graphics report (see mobile-fix.js)
  // for diagnostics: the most players seen on the field during the current game
  var fieldWatch = { match: null, most: 0, secs: 0, started: 0 };
  setInterval(function () {
    try {
      var m = currentMatch();
      if (!m) { fieldWatch.match = null; return; }
      if (m !== fieldWatch.match) { fieldWatch.match = m; fieldWatch.most = 0; fieldWatch.started = Date.now(); }
      var n = 0, all = _si(72);
      for (var k in all) if (Object.prototype.hasOwnProperty.call(all, k)) n++;
      if (n > fieldWatch.most) fieldWatch.most = n;
      fieldWatch.secs = Math.round((Date.now() - fieldWatch.started) / 1000);
    } catch (e) {}
  }, 1000);

  var diagBtn = document.getElementById("a-nfl-diag");
  if (diagBtn) diagBtn.onclick = function () {
    var d = window.__rbDiagnostics || {}, match = null;
    try { match = currentMatch(); } catch (e) {}
    var players = 0;
    try { var all = _si(72); for (var k in all) if (Object.prototype.hasOwnProperty.call(all, k)) players++; } catch (e) {}
    var c = document.getElementById("canvas"), g = null, roster = "?";
    try { g = globalObj(); roster = g && g._Ln !== undefined ? _wi(g._Ln) : "?"; } catch (e) {}
    var room = "?";
    try { room = window._Sc2._sN2; } catch (e) {}
    var nav = "?";
    try { nav = performance.getEntriesByType("navigation")[0].type; } catch (e) {}
    var log = (window.__rbLog || []).slice(-12);
    alert([
      "GPU: " + (d.renderer || "?"),
      "WebGL: " + (d.version || "?") + "  highp: " + (d.fragHighp || 0),
      "Screen: " + innerWidth + "x" + innerHeight + " @" + (window.devicePixelRatio || 1) + "x  canvas " + (c ? c.width + "x" + c.height : "?"),
      "In a game: " + (match ? "yes" : "no") + "  players on field: " + players + "  most this game: " + fieldWatch.most + "  (" + fieldWatch.secs + "s in game)",
      "Room: " + room + "  roster: " + roster + "  team: " + (g ? g._Ip : "?") + "  page: " + nav + (window.__retroWarmed ? " (warm-up done)" : ""),
      "Shader errors: " + (d.errors && d.errors.length ? d.errors.join(" || ") : "none"),
      "Log: " + (log.length ? "\n" + log.join("\n") : "empty"),
      navigator.userAgent
    ].join("\n"));
  };

  after("_qK", installRealRoster);   // roster for a brand new save
  after("_cE", installRealRoster);   // roster when taking charge of a team

  // A new save builds its roster before the user's team is picked, so the roster we
  // installed may belong to the wrong team. Detect exactly that state (every player is
  // one we installed, all for another team) and swap in the right team's players.
  // Rosters the user has built themselves are never touched.
  setInterval(function () {
    try {
      var g = globalObj();
      if (!g || !g._Ln || _wi(g._Ln) === 0) return;
      for (var i = 0; i < _wi(g._Ln); i++) {
        var pm = _zi(g._Ln, i);
        var t = _Ai(pm, "nflteam");
        if (t === undefined || Number(t) === Number(g._Ip)) return;
      }
      installRealRoster();
    } catch (e) {}
  }, 500);
  after("_bH", realTradeList);       // trade list refresh

  // ---------- game simulation ----------
  // Ends the user's match with a score generated from both teams' offense / defense
  // (the same inputs the game uses to simulate every other fixture).
  var AUTOSIM_KEY = "nfl_autosim";
  function currentMatch() {
    var all = _si(71);
    for (var k in all) if (Object.prototype.hasOwnProperty.call(all, k)) return all[k];
    return null;
  }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function footballScore(expected) {
    var pts = Math.max(0, Math.round(expected + rnd(-8, 8)));
    var td = Math.floor(pts / 7), rest = pts - td * 7, fg = rest >= 5 ? 2 : rest >= 2 ? 1 : 0;
    var score = td * 7 + fg * 3;
    if (td > 0 && Math.random() < 0.08) score -= 1; // missed extra point
    return score;
  }
  function simulateMatch() {
    var g = globalObj(), match = currentMatch();
    if (!g || !match || !match._Sb1 || match._0z === undefined) return false;
    if (g._fx) return false; // practice / training session
    var teams = g._Fj || [], me = Number(g._Ip), mine = null, theirs = null, homeIsMe = false;
    for (var i = 0; i < 2; i++) {
      var t = teams[i];
      if (t === undefined) continue;
      if (Number(_Ai(t, "uid")) === me) { mine = t; homeIsMe = i === 1; } else theirs = t;
    }
    var num = function (t, k, d) { var v = t ? Number(_Ai(t, k)) : NaN; return isFinite(v) ? v : d; };
    var myOff = num(mine, "offense", 6), myDef = num(mine, "defense", 6);
    var opOff = num(theirs, "offense", 6), opDef = num(theirs, "defense", 6);
    var myScore = footballScore(21 + (myOff - opDef) * 2.2 + (homeIsMe ? 1.5 : 0));
    var opScore = footballScore(21 + (opOff - myDef) * 2.2 + (homeIsMe ? 0 : 1.5));
    var myOT = 0, opOT = 0;
    if (myScore === opScore) { // settle it in overtime: the stronger side is more likely to score
      var myEdge = (myOff + myDef) - (opOff + opDef) + (homeIsMe ? 1 : -1);
      if (Math.random() < 0.5 + myEdge * 0.04) myOT = 3; else opOT = 3;
    }
    var side = match._0z ? 1 : 0;
    // per-quarter scoreboard (4 quarters + overtime) shown on the result screen
    var byQuarter = function (total, ot) {
      var q = [0, 0, 0, 0, ot], left = total;
      while (left > 0) {
        var c = left >= 9 || left === 7 ? 7 : left === 8 ? 3 : left >= 6 ? 6 : left >= 3 ? 3 : left;
        q[rnd(0, 3)] += c;
        left -= c;
      }
      return q;
    };
    var boards = [g._Et, g._Ht], mineQ = byQuarter(myScore, myOT), theirQ = byQuarter(opScore, opOT);
    [mineQ, theirQ].forEach(function (q, who) {
      var arr = boards[who === 0 ? side : 1 - side];
      if (arr) for (var i = 0; i < 5; i++) arr[i] = q[i];
    });
    myScore += myOT; opScore += opOT;
    // the game's own "end match" routine adds 3 points to the user's side
    match._Sb1[side] = myScore - 3;
    match._Sb1[side ? 0 : 1] = opScore;
    _5g1(g, g);
    return true;
  }
  var autosim = false;
  try { autosim = localStorage.getItem(AUTOSIM_KEY) === "1"; } catch (e) {}
  var autosimBox = document.getElementById("nfl-autosim");
  if (autosimBox) {
    autosimBox.checked = autosim;
    autosimBox.onchange = function () {
      autosim = autosimBox.checked;
      try { localStorage.setItem(AUTOSIM_KEY, autosim ? "1" : "0"); } catch (e) {}
    };
  }
  function closeModMenu() {
    var x = document.getElementById("jax-x"), panel = document.getElementById("jax-panel");
    if (x && panel && panel.classList.contains("open")) x.click();
  }
  var simBtn = document.getElementById("a-nfl-sim");
  if (simBtn) simBtn.onclick = function () {
    if (!currentMatch()) { alert("Start a game first, then press SIM THIS GAME."); return; }
    closeModMenu();
    setTimeout(function () { try { simulateMatch(); } catch (e) { alert("Could not simulate: " + e.message); } }, 300);
  };
  var lastSimmed = null;
  setInterval(function () {
    if (!autosim) return;
    try {
      var match = currentMatch();
      if (!match || match === lastSimmed) return;
      if (document.getElementById("jax-panel").classList.contains("open")) return;
      lastSimmed = match;
      setTimeout(function () { try { if (currentMatch() === match) simulateMatch(); } catch (e) {} }, 1200);
    } catch (e) {}
  }, 500);

  // ---------- drawing hooks ----------

  var drawText = _nh1, drawTextColour = _RD1, drawTextTransformed = __G1, drawSprite = _mh1;
  var recent = {};

  function drawLogoBeside(uid, x, y, str) {
    // returns the x shift to apply to the text so logo + text stay aligned
    var w = _lh1(str), h = _lF1(str);
    var halign = _nD2._iF2, valign = _nD2._jF2;
    // small table text gets a compact logo; headline text a bigger one
    var small = h < 17;
    // logo art is LOGO_W x LOGO_H pixels inside its 64x64 frame
    var scale = small ? 15 / LOGO_H : Math.max(0.25, Math.round((h * 1.7 / LOGO_H) * 4) / 4);
    var size = LOGO_W * scale, gap = small ? 3 : Math.max(2, h * 0.3);
    // list/table rows are often clipped to their box, so push left-aligned
    // small text right and put the logo where the text used to start
    var shift = small && halign === 0 ? size + gap : 0;
    var left = x + shift - (halign === 1 ? w / 2 : halign === 2 ? w : 0);
    var cy = y + (valign === 0 ? h / 2 : valign === 2 ? -h / 2 : 0);
    var now = performance.now(), key = str, r = recent[key];
    // text with a drop shadow is drawn twice, a few pixels apart; only draw one logo for it.
    // The same text drawn again at the very same spot (the game does this on some frames, and
    // only the second copy reaches the screen) gets its logo again, or the logo flickers.
    var shadow = r && now - r.t < 10 && Math.abs(r.x - x) <= 3 && Math.abs(r.y - y) <= 3 && (r.x !== x || r.y !== y);
    if (!shadow) {
      drawSprite(null, LOGO_SPRITE, uid, left - gap - size / 2, cy, scale, scale, 0, 16777215, 1);
    }
    recent[key] = { t: now, x: x, y: y };
    return shift;
  }

  function teamUidFor(str) {
    if (typeof str !== "string" || str.length > 24) return -1;
    var u = nameToUid[str.trim().toUpperCase()];
    return u === undefined ? -1 : u;
  }

  window._nh1 = function (x, y, str) {
    var uid = teamUidFor(str);
    if (uid >= 0) { try { x += drawLogoBeside(uid, x, y, str); } catch (e) { console.log("NFLMOD text error " + e.stack); } }
    return drawText(x, y, str);
  };
  window._RD1 = function (x, y, str, c1, c2, c3, c4, a) {
    var uid = teamUidFor(str);
    if (uid >= 0) { try { x += drawLogoBeside(uid, x, y, str); } catch (e) { console.log("NFLMOD text error " + e.stack); } }
    return drawTextColour(x, y, str, c1, c2, c3, c4, a);
  };

  function homeTeam(inst) {
    try {
      var g = _jj(inst, inst, 64), teams = g && g._Fj;
      if (!teams) return null;
      var map = teams[1];
      var uid = Number(_Ai(map, "uid"));
      if (!(uid >= 0 && uid < 32)) return null;
      return { uid: uid, name: String(_Ai(map, "name") || TEAMS[uid][1]) };
    } catch (e) { return null; }
  }

  // The field object draws both endzones (spr_endzone = 24) right before the players.
  // After the second endzone, paint the home team's logo at midfield and its
  // name in both endzones.
  window._mh1 = function (inst, spr, sub, x, y, xs, ys, rot, col, alpha) {
    drawSprite(inst, spr, sub, x, y, xs, ys, rot, col, alpha);
    if (spr === 24 && x === 2302 && y === 132) {
      var home = homeTeam(inst);
      if (!home) return;
      try {
        drawSprite(null, LOGO_SPRITE, home.uid, 1301, 301, 2.5, 2.5, 0, 16777215, 0.9);
        var oldCol = _2J2(), oldFont = _nD2._lF2, oldH = _nD2._iF2, oldV = _nD2._jF2;
        var label = home.name.toUpperCase();
        _gh1(2); _hh1(1); _ih1(1);
        var w = _lh1(label), h = _lF1(label);
        var s = Math.min(4, 300 / Math.max(1, w), 150 / Math.max(1, h));
        _Eh1(0x000000);
        drawTextTransformed(200 + 3, 301 + 3, label, s, s, 90);
        drawTextTransformed(2402 - 3, 301 + 3, label, s, s, 270);
        _Eh1(0xffffff);
        drawTextTransformed(200, 301, label, s, s, 90);
        drawTextTransformed(2402, 301, label, s, s, 270);
        _Eh1(oldCol); _gh1(oldFont); _hh1(oldH); _ih1(oldV);
      } catch (e) { console.log("NFLMOD endzone error " + e.stack); }
    }
  };
})();

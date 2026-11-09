// The first time Retro is opened in a session (e.g. from the RETRO button on the Gridiron GM home
// screen), the first game on iPhone could have no players on the field for the whole game. A
// reload (mod menu > RELOAD GAME) always fixed it. So the first open does that reload by itself:
// it lets the game finish loading once, then reloads, with a loading cover over the screen so it
// just looks like a slightly longer load. Later opens in the same session, and reloads, play
// straight away.
(function () {
  var KEY = "retro_warm";
  var isReload = false;
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    isReload = nav ? nav.type === "reload" : !!(performance.navigation && performance.navigation.type === 1);
  } catch (e) {}
  var warm = false;
  try { warm = sessionStorage.getItem(KEY) === "1"; } catch (e) { return; } // no session storage: leave it alone
  if (isReload || warm) {
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    return;
  }

  var cover = document.createElement("div");
  cover.id = "retro-warmup";
  cover.textContent = "LOADING...";
  cover.style.cssText = "position:fixed;inset:0;z-index:30000;display:flex;align-items:center;justify-content:center;" +
    "background:#000;color:#fff;font:14px/1.8 'Press Start 2P',monospace;letter-spacing:1px";
  document.body.appendChild(cover);

  var started = Date.now(), done = false;
  function reloadOnce() {
    if (done) return;
    done = true;
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    location.reload();
  }
  // wait until the game is running (it has entered its first room), then reload
  var timer = setInterval(function () {
    var room = "";
    try { room = String(window._Sc2 && window._Sc2._sN2 || ""); } catch (e) {}
    if (/^rm_/.test(room)) { clearInterval(timer); setTimeout(reloadOnce, 400); }
    else if (Date.now() - started > 25000) { clearInterval(timer); reloadOnce(); }
  }, 150);
})();

// Save coverage: every piece of game state in App.jsx is either written by the full save (and read
// back by the one loader every load path uses) or listed below as session-only. A new useState
// that's in neither fails here, so it can't quietly be lost when the game is reloaded.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

// Screen and moment-to-moment state: open popups, tabs, the live game in progress, draft timers,
// one-off modals, and a few unused leftovers. Fine to lose on a reload.
const SESSION_ONLY = new Set([
  "ownerReviewShow",
  "advanceAsk aiNegRound arbModal arbWindow autoSaveTs awardsShow beatReports boxView byeStrategy",
  "capOutlookOpen capRollover celebrate challengeSeason chemGraph coachExt coachNag",
  "coachSynergyBonus compareOpen compareSel compareSlots cutWarnPending ddaAdj deadlineUrgency",
  "depthView difficulty docCard draftActive draftAnalyst draftAnalystLoading draftBuzz draftClock",
  "draftClockActive draftEvents draftLotteryOpen draftLotteryResult draftPaused draftPickTrade",
  "draftReveal draftRumors draftSpeed draftTicker draftTimer draftView dynastyEndOpen",
  "dynastyShareOpen expansionModal expansionMode expansionResults extTalk faBid faCombine",
  "findTradeOpen firedOffer foFilter foSort foView forPick fourthChoice gemScout globalLB",
  "globalLBLoading gmDMs gmFireModal godEditTeam godMode hofModal holdoutNeg hubSection inboxOpen",
  "inboxShow injToasts isMobile lastLivePlay lastSaved lbTab leaderboardOpen liveAwaitingCall",
  "liveBroadcastMode liveCallMode liveClock liveDone liveDown liveInfo liveLog liveMomentum livePOG",
  "livePaused livePendingCall livePhase livePlay livePoss liveQteBar liveQtr liveRecTargets",
  "liveScore liveSim liveSpeed liveStats liveToGo liveYard lkrOpen lkrSpeechModal localLeaderboard",
  "loginStreak mediaStory mediaWeek menuOpen mleUsed mobileHint moreOpen msg multiOpen mvpModalOpen",
  "negPlayer newsOpen newspaper nextGameWx offszGrade offszGradeOpen online paradeOpen pcTimer",
  "phase pickIsIn posDemandMap powerRankings prBroadcast pressConf proUnlocked psPoachAttempt",
  "psRaceResult psReport realDraft resignTalk restructModal rivalTaunt rosterTeam rosterView",
  "savSlots searchOpen seasonMVP sel sf shareModalOpen shareText showChallenges showDepth",
  "showFranchiseSale showIR showInjRpt showIntro showLiveEnd showPS showPlayoffOdds showRecapCard",
  "showSeasonSummary showShareCard simGameLog simTicker simming slotsV spectatorGame spectatorLog",
  "startAsk startLive streakBonus tab tdCalls tdOpen theme todayChallenge tourOffer tourStep trOff",
  "trTm tradeDesk tradeDeskOpen tradeFinderResults tradeTab tradeTimer tradeTimerActive trainFocus",
  "trophySpot upCalls upPassed urgentTrade urgentTradeActive urgentTradeTimer weekResult",
].join(" ").split(" "));

const states = [...src.matchAll(/const\[(\w+),set\w+\]=(?:React\.)?useState/g)].map((m) => m[1]);
const saveObj = src.slice(src.indexOf("const fullSaveData=()=>({"), src.indexOf("});", src.indexOf("const fullSaveData=()=>({")));
const saved = new Set(saveObj.replace("const fullSaveData=()=>({", "").split(",").map((k) => k.split(":")[0].trim()));
const loaderStart = src.indexOf("const applyFullSave=");
const loader = src.slice(loaderStart, src.indexOf("\n", src.indexOf("const _def=defaultSaveState();", loaderStart)));

test("every piece of game state is saved or marked session-only", () => {
  const loose = states.filter((n) => !saved.has(n) && !SESSION_ONLY.has(n));
  assert.deepEqual(loose, [], `add these to fullSaveData (and applyFullSave) or to SESSION_ONLY: ${loose.join(", ")}`);
});

test("everything the full save writes, the loader reads back", () => {
  const viaHelpers = new Set(["v", "capv", "dlSlots", "teams", "scouting", "depthOrder"]); // migrateCap(d), loadScouting(d), dlSlotsMigrate(d)
  const unread = [...saved].filter((k) => !viaHelpers.has(k) && !loader.includes(`d.${k}`));
  assert.deepEqual(unread, [], `saved but never restored: ${unread.join(", ")}`);
});

test("the automatic save and Continue use the full save and the full loader", () => {
  assert.match(src, /const autoSave=\(\)=>\{[^}]*const d=fullSaveData\(\)/, "autosave writes fullSaveData()");
  assert.match(src, /const applyAutoSave=d=>\{if\(!d\?\.teams\)return;applyFullSave\(d/, "Continue loads through applyFullSave");
});

test("no save path builds its own partial save, and every load path uses the full loader", () => {
  assert.equal((src.match(/=\{v:3,/g) || []).length, 0, "a hand-built save object (use fullSaveData())");
  for (const fn of ["exportLeague", "saveGame", "saveSavSlot", "autoSave"]) {
    const body = src.slice(src.indexOf(`const ${fn}=`), src.indexOf("\n", src.indexOf(`const ${fn}=`)));
    assert.match(body, /fullSaveData\(\)/, `${fn} writes the full save`);
  }
  for (const fn of ["importLeague", "loadGame", "loadSavSlot", "applyAutoSave"]) {
    const body = src.slice(src.indexOf(`const ${fn}=`), src.indexOf("\n", src.indexOf(`const ${fn}=`)));
    assert.match(body, /applyFullSave\(/, `${fn} loads through applyFullSave`);
  }
});

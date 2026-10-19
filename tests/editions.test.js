import test from "node:test";
import assert from "node:assert/strict";
import { deadlineEdition, draftEdition, hofEdition } from "../src/editions.js";

const teams = Array.from({ length: 32 }, (_, i) => ({ ab: `T${i}`, city: `City${i}`, name: `Club${i}`, w: i % 9, l: 9 - (i % 9) }));
const P = (name, pos, ovr, extra = {}) => ({ id: name, name, pos, ovr, age: 28, ...extra });

test("deadline edition: a blockbuster leads the paper; a quiet day says so", () => {
  const deals = [{ buyer: 3, seller: 7, player: P("Star Guy", "WR", 88), players: [], picks: [{ rd: 1 }] }, { buyer: 3, seller: 9, player: P("Depth Guy", "LB", 72), players: [], picks: [{ rd: 5 }] }];
  const e = deadlineEdition({ state: { deals, feed: [] }, teams, ui: 0, yr: 2027 });
  assert.equal(e.kind, "deadline");
  assert.match(e.head, /STAR GUY/);
  assert.ok(e.story.some((s) => s.includes("Club3")) && e.boxes[0].items.length === 2);
  const q = deadlineEdition({ state: { deals: [], feed: [] }, teams, ui: 0, yr: 2027 });
  assert.match(q.story[0], /not a single deal/);
});

test("draft edition: the first pick, steals and your class", () => {
  const log = Array.from({ length: 64 }, (_, i) => ({ overall: i + 1, rd: i < 32 ? 1 : 2, owner: i % 32, grade: i === 20 ? "A+" : "B", player: P(`Pick ${i + 1}`, "CB", 70, { college: "State" }) }));
  const e = draftEdition({ log, teams, ui: 5, yr: 2027 });
  assert.match(e.head, /PICK 1/);
  assert.ok(e.story.some((s) => s.includes("Pick 21")), "the steal is named");
  assert.ok(e.boxes.some((b) => b.title === "Your Class"));
});

test("Hall of Fame edition: the headliner, the class and your own", () => {
  const entries = [{ id: 1, name: "Big Legend", pos: "QB", legacy: 90, peak: 97, seasons: 15, rings: 2, team: "T4", age: 38, hofClass: 2032 }, { id: 2, name: "Other One", pos: "CB", legacy: 60, peak: 92, seasons: 11, team: "T1", age: 34, hofClass: 2032 }];
  const e = hofEdition({ entries, yr: 2027, mineAb: "T1", abName: (ab) => ab });
  assert.match(e.head, /BIG LEGEND/);
  assert.ok(e.story.some((s) => s.includes("Other One")) && e.boxes[0].items.length === 2);
  assert.ok(e.story.some((s) => /proud day/.test(s)));
  assert.ok(!/"/.test(e.story.join(" ")), "straight quotes become curly");
});

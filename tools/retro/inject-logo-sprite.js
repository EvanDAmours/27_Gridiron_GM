// One-time patch: registers the NFL logo sheet (html5game/RetroBowl_texture_2.png)
// as a native GameMaker sprite named spr_nfl_logos (sprite index 205).
// Frame N of the sprite = team uid N. Safe to re-run (no-op if already patched).
//   node tools/nfl/inject-logo-sprite.js
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../../public/retro/html5game/RetroBowl.js");
let s = fs.readFileSync(file, "utf8");
if (s.includes("'spr_nfl_logos'")) { console.log("already patched"); process.exit(0); }

const CELL = 64, COLS = 8, COUNT = 32;
const TPE_BASE = 637; // existing texture page entries: 0..636

function replaceOnce(from, to) {
  const i = s.indexOf(from);
  if (i < 0 || s.indexOf(from, i + 1) >= 0) throw new Error("anchor not unique: " + from.slice(0, 60));
  s = s.slice(0, i) + to + s.slice(i + from.length);
}

// 1) texture page entries
let tpe = "";
for (let i = 0; i < COUNT; i++) {
  const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * CELL;
  tpe += `,\n\t\t{ x: ${x}, y: ${y}, _a2: ${CELL}, _b2: ${CELL}, _gh: 0, _hh: 0, _ih: ${CELL}, _jh: ${CELL}, _kh: ${CELL}, _lh: ${CELL}, _mh: 2 }`;
}
replaceOnce("_kh: 41, _lh: 9, _mh: 0 }\n\t],\n\t_nh: [", "_kh: 41, _lh: 9, _mh: 0 }" + tpe + "\n\t],\n\t_nh: [");

// 2) texture page list + options + texture group membership
replaceOnce("_nh: ['RetroBowl_texture_0.png', 'RetroBowl_texture_1.png'],", "_nh: ['RetroBowl_texture_0.png', 'RetroBowl_texture_1.png', 'RetroBowl_texture_2.png'],");
replaceOnce("_oh: [{ MipsToGenerate: 0 }, { MipsToGenerate: 0 }],", "_oh: [{ MipsToGenerate: 0 }, { MipsToGenerate: 0 }, { MipsToGenerate: 0 }],");
replaceOnce("_qh: [0, 1],", "_qh: [0, 1, 2],");
replaceOnce("\t\t\t\t203, 204\n\t\t\t],", "\t\t\t\t203, 204, 205\n\t\t\t],");

// 3) sprite definition
const frames = [], keys = [];
for (let i = 0; i < COUNT; i++) {
  frames.push(TPE_BASE + i);
  keys.push(`{ key: ${i}, length: 1, _A1: !1, _B1: !1, _C1: { 0: { imageIndex: ${i} } } }`);
}
const spr = `,
		{
			_51: 'spr_nfl_logos',
			width: ${CELL},
			height: ${CELL},
			_f1: !1,
			_g1: !1,
			preload: !1,
			_h1: !1,
			_G1: ${CELL / 2},
			_H1: ${CELL / 2},
			_I1: 0,
			_i1: ${CELL - 1},
			_J1: 0,
			_j1: ${CELL - 1},
			_k1: 0,
			_l1: [${frames.join(", ")}],
			_m1: {
				_51: '',
				_n1: 1,
				_o1: 0,
				_p1: 0,
				length: ${COUNT},
				_q1: ${CELL / 2},
				_r1: ${CELL / 2},
				volume: 1,
				_s1: [],
				_t1: [
					{
						_u1: 'GMSpriteFramesTrack',
						_51: 'frames',
						_v1: 0,
						_w1: 0,
						_x1: 0,
						_y1: [],
						_z1: [],
						_t1: [],
						_s1: [
							${keys.join(",\n\t\t\t\t\t\t\t")}
						]
					}
				],
				_D1: [],
				_E1: []
			}
		}
	],
	_R1: [],`;
replaceOnce("\n\t\t}\n\t],\n\t_R1: [],", "\n\t\t}" + spr);

fs.writeFileSync(file, s);
console.log("patched: spr_nfl_logos = sprite 205, TPE " + TPE_BASE + ".." + (TPE_BASE + COUNT - 1));

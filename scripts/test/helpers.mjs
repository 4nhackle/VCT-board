// 시험 도우미: t() 는 시험을 돌리고 센다. 여러 시험 파일이 함께 쓰는 값과 fixture 를 둔다.

export const T = 46326; // 2026-10-31 (KST)
let n = 0;
export function t(name, fn) { fn(); n++; console.log("ok", name); }
export const count = () => n;

// 로스터 탭(PR 6). 기준일 T. 로스터는 현재 진행 중 경력이 그 팀인 인물.
export const RT = {
  sources: {}, schedule: [], transfers: { players: [], coaches: [] }, players: [], coaches: [], watch: [],
  teams: [
    { id: "zz", name: "Zed", region: "Americas", tier: "ascended", active: true },
    { id: "aa", name: "Alpha", region: "Americas", tier: "partner", active: true },
    { id: "mm", name: "Mid", region: "EMEA", tier: "partner", active: true },
    { id: "ch", name: "Chal", region: "Americas", tier: "challengers", active: true },
    { id: "cl", name: "Closed", region: "Pacific", tier: "partner", active: false }
  ],
  people: [
    { id: "coach1", name: "Coach", kind: "coach", role: "Head Coach", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p1", name: "P1", kind: "player", role: "Duelist", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p2", name: "P2", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p3", name: "P3", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p4", name: "P4", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p5", name: "P5", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "m1", name: "M1", kind: "player", career: [{ team: "mm", from: "2026-01", to: null }] },
    { id: "ch1", name: "C1", kind: "player", career: [{ team: "ch", from: "2026-01", to: null }] }
  ]
};

// ── 9회차 F-06: 핵심 규칙을 지금 동작대로 고정한다. 날짜는 절대 일련번호로 적는다.
export const serialOf = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5;

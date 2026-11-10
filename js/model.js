// 순수 함수만: 시트 행 → 화면용 항목, 상태 분류, 필터. DOM과 state를 직접 만지지 않는다.
// 실제 코드는 js/model/ 에 있다. 이 파일은 공개 이름을 다시 내보내기만 한다(새 이름은 없다).
export { REGIONS, TIERS, regionName, regionShort, tierName } from "./model/labels.js";
export { ID_RE, slugOf, toItem, idsOf, cleanName, fold } from "./model/ids.js";
export { pillOf, cls, pillText, routeOf, watchMeta } from "./model/status.js";
export { noteSegments, sharedTails, hasTail, ownPart, ownItem } from "./model/notes.js";
export { ageOf, contractOK, contractState, careerOf, newestFirst, teamNameOf, teamMoves, teamNews, rosterCards, buildIndex } from "./model/people.js";
export { mergeMoves, buildTabs, matches } from "./model/tabs.js";

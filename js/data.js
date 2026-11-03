// 게임 데이터 테이블 — 확정 기획 반영
// (스탯 17+3, 종족 12, 직업 15, 특성, 명성, 장비, 몬스터, 보스, 시설, 서사, 연말 평가)
var G = window.G = window.G || {};
G.D = {};

// ───────────── 스탯 ─────────────
// CA 계산 대상 17개 (1~20). 꾸준함·운·천재성은 훈련 불가(타고남)
G.D.STATS = ['str', 'agi', 'con', 'mag', 'rec', 'int', 'dex', 'sta', 'com', 'lea', 'vis', 'tea', 'jud', 'cns', 'ada', 'gen', 'luk'];
G.D.PHYS = ['str', 'agi', 'con', 'mag', 'rec', 'int', 'dex', 'sta'];
G.D.MENT = ['com', 'lea', 'vis', 'tea', 'jud', 'cns', 'ada', 'gen', 'luk'];
G.D.BODY = ['str', 'agi', 'con', 'rec', 'sta']; // 노화로 떨어지는 육체 스탯
G.D.STAT_NAME = {
  str: '근력', agi: '민첩성', con: '체력', mag: '마력', rec: '회복력', int: '지능', dex: '손재주', sta: '지구력',
  com: '침착성', lea: '리더십', vis: '시야', tea: '팀워크', jud: '판단력', cns: '꾸준함', ada: '적응력', gen: '천재성', luk: '운',
  ten: '긴장', agg: '호전성', inj: '부상 빈도'
};
G.D.STAT_DESC = {
  str: '물리 공격력과 무거운 장비 착용 한도', agi: '회피율, 이동·행동 속도', con: '최대 HP와 물리 방어력의 기반',
  mag: '마법 공격력과 마나 통', rec: '자연 치유량과 부상 회복 속도', int: '마법 방어력·마법 공격 보정·기믹 파훼',
  dex: '치명타 확률, 명중률, 함정 해제', sta: '탐험 유지력. 바닥나면 전 스탯이 반토막',
  com: '마법 방어, 공포·멘탈 공격 저항', lea: '부대 전술 수행력, 팀워크 하락 방지', vis: '명중·회피, 함정·기습 방지',
  tea: '아군 지원, 최적 타겟팅', jud: '공격 흘리기(방어), AI 스킬 타겟팅', cns: '성장 유지, 극히 낮은 확률로 잠재력 돌파',
  ada: '전직 페널티 회복, 종족 갈등 중재', gen: '쿨타임 무시·슈퍼 플레이 확률', luk: '전리품 등급, 치명상 회피, 억까 방지',
  ten: '미궁에서 오르는 페널티 수치(명중·전술 수행력 하락)', agg: '선제공격 확률↑, 진형 이탈 변수', inj: '피격 시 부상·치명상 확률 (숨김)'
};
// 훈련장 레벨별 훈련 가능 스탯 (14개). 꾸준함/운/천재성은 훈련 불가
G.D.TRAINABLE = [
  ['str', 'agi', 'con', 'sta', 'dex'],
  ['str', 'agi', 'con', 'sta', 'dex', 'mag', 'int', 'rec', 'vis', 'jud'],
  ['str', 'agi', 'con', 'sta', 'dex', 'mag', 'int', 'rec', 'vis', 'jud', 'com', 'lea', 'tea', 'ada']
];

// ───────────── 명성 ─────────────
G.D.FAME = [
  { t: 'F', pts: 0, ca: [10, 30], desc: '무명 신출내기' },
  { t: 'E', pts: 100, ca: [18, 40], desc: '골목에서 이름이 오르내림' },
  { t: 'D', pts: 250, ca: [25, 50], desc: '동네에서 제법 알려짐' },
  { t: 'C', pts: 450, ca: [40, 70], desc: '도시의 실력파' },
  { t: 'B', pts: 700, ca: [60, 90], desc: '왕국에서 주목받는 정예' },
  { t: 'A', pts: 1000, ca: [80, 110], desc: '이름난 일류 용병단' },
  { t: 'S', pts: 1400, ca: [100, 130], desc: '전설적인 용사 길드' }
];

// ───────────── 종족 ─────────────
// up: 성장 특화(×1.3) / down: 성장 저하(×0.7) / ageScale: 노화 기준 배수 / ages: 지원 나이 범위
G.D.RACES = {
  human: { name: '인간', up: ['tea', 'cns'], down: [], traits: ['versatile', 'pioneer'], ageScale: 1, ages: [16, 52], w: 30, desc: '균형 잡힌 기본 종족. 전직이 가장 수월하다.' },
  elf: { name: '엘프', up: ['mag', 'int', 'agi'], down: ['str', 'con', 'rec'], traits: ['manaAffinity', 'arrogance'], ageScale: 2.5, ages: [40, 130], w: 8, desc: '노화가 늦지만 육체가 허약하고 타 종족과 유대가 낮다.' },
  dwarf: { name: '드워프', up: ['str', 'con', 'rec'], down: ['mag', 'agi'], traits: ['craftsman', 'ironStomach'], ageScale: 1.6, ages: [25, 85], w: 9, desc: '단단한 몸과 장비 이해도로 최전열을 맡는다.' },
  demon: { name: '마족', up: ['str', 'mag'], down: ['tea', 'com', 'jud'], traits: ['bloodlust', 'miasma'], ageScale: 1.5, ages: [20, 75], w: 5, desc: '압도적 전투력, 통제가 어려운 하이리스크 종족.' },
  wolf: { name: '수인(늑대)', up: ['vis', 'tea'], down: ['int', 'mag'], traits: ['packHunt'], ageScale: 1, ages: [16, 48], w: 6, desc: '시야와 팀워크가 최상위. 무리 사냥에 능하다.' },
  cat: { name: '수인(고양이)', up: ['agi', 'luk'], down: ['int', 'mag'], traits: ['nightCat', 'supple'], ageScale: 1, ages: [16, 46], w: 6, desc: '민첩과 운이 매우 높다. 기습을 당하지 않는다.' },
  bear: { name: '수인(곰)', up: ['con', 'str'], down: ['agi', 'int', 'mag'], traits: ['hibernate', 'thickHide'], ageScale: 1.1, ages: [18, 52], w: 5, desc: '체력과 근력 최상위, 민첩 최하위.' },
  bird: { name: '수인(조류)', up: ['vis', 'jud'], down: ['int', 'mag'], traits: ['scout'], ageScale: 1, ages: [16, 46], w: 5, desc: '시야와 판단력 최상위. 다음 층을 정찰한다.' },
  dragon: { name: '용인', up: ['str', 'con', 'mag'], down: ['tea', 'lea', 'cns'], traits: ['dragonScale', 'selfRighteous'], ageScale: 2, ages: [30, 110], w: 3, desc: '압도적 무력, 자존심이 강해 통제가 까다로운 최상위 종족.' },
  homun: { name: '호문쿨루스', up: [], down: [], traits: ['emotionless', 'manastoneCore'], ageScale: 0, ages: [1, 12], w: 3, desc: '연금술 인조인간. 종족 성장 보정·노화·포텐 폭발이 없다.' },
  fairy: { name: '요정족', up: ['agi', 'int', 'luk', 'vis'], down: ['str', 'con', 'rec'], traits: ['windBlessing', 'fragile'], ageScale: 1.5, ages: [20, 70], w: 5, desc: '작고 빠르며 마법과 회피에 능하지만 충격에 매우 약하다.' },
  lizard: { name: '리자드맨', up: ['rec', 'con', 'com'], down: ['int', 'mag', 'lea'], traits: ['regeneration', 'coldBlood'], ageScale: 1, ages: [16, 50], w: 7, desc: '혹독한 환경에 적응한 생존 전문가.' }
};

// ───────────── 직업 ─────────────
// core(×2.0) 5개 / sub(×1.0) 6개 / 나머지 6개(×0.5) → 가중치 합 19, CA = 가중합 ÷ 1.9
// up/down: 성장 특화 ×1.3 / 성장 저하 ×0.7 (각 3개로 통일)
// range: melee(전열만 정상 피해) / reach(중열도 정상) / ranged
G.D.CLASSES = {
  swordsman: { name: '검사', tier: 1, w: 14, row: 'front', range: 'melee', up: ['str', 'con', 'jud'], down: ['mag', 'int', 'ada'],
    core: ['str', 'con', 'jud', 'agi', 'dex'], sub: ['sta', 'rec', 'com', 'vis', 'tea', 'gen'],
    plus: '안정적인 전열 딜탱 (방어력 +10%)', minus: '원거리·광역 대응 없음, 전직 페널티 1.5배',
    weapons: ['sword', 'greatsword'], skills: ['powerStrike'], sprite: 'swordsman' },
  archer: { name: '궁수', tier: 1, w: 12, row: 'back', range: 'ranged', up: ['agi', 'vis', 'com'], down: ['str', 'lea', 'con'],
    core: ['agi', 'vis', 'com', 'dex', 'jud'], sub: ['sta', 'str', 'luk', 'gen', 'int', 'cns'],
    plus: '안전한 후열 딜, 함정 발견 +', minus: '근접 공격을 받으면 피해 +30%',
    weapons: ['bow'], skills: ['aimedShot'], sprite: 'archer' },
  priest: { name: '사제', tier: 1, w: 11, row: 'back', range: 'ranged', up: ['int', 'rec', 'tea'], down: ['str', 'agi', 'dex'],
    core: ['int', 'rec', 'tea', 'mag', 'com'], sub: ['lea', 'jud', 'cns', 'sta', 'con', 'vis'],
    plus: '치유와 멘탈 케어 (정화)', minus: '공격력 ×0.6, 40층 치유 반전에 취약',
    weapons: ['mace', 'staff'], skills: ['heal', 'purify'], sprite: 'priest' },
  knight: { name: '기사', tier: 1, w: 11, row: 'front', range: 'melee', up: ['con', 'lea', 'tea'], down: ['mag', 'luk', 'agi'],
    core: ['con', 'lea', 'tea', 'str', 'jud'], sub: ['sta', 'com', 'rec', 'vis', 'cns', 'dex'],
    plus: '도발로 어그로 집중, 주장일 때 리더십 +2', minus: '중장비로 지구력 소모 ×1.3, 행동 속도 −15%',
    weapons: ['swordShield', 'mace'], skills: ['taunt'], sprite: 'knight' },
  mage: { name: '마법사', tier: 1, w: 10, row: 'back', range: 'ranged', up: ['mag', 'int', 'com'], down: ['con', 'rec', 'sta'],
    core: ['mag', 'int', 'com', 'jud', 'gen'], sub: ['vis', 'cns', 'rec', 'sta', 'dex', 'tea'],
    plus: '광역 폭딜 (화염 폭발)', minus: '마나가 금방 바닥나고 HP ×0.85',
    weapons: ['staff'], skills: ['fireball'], sprite: 'mage' },
  rogue: { name: '도적', tier: 1, w: 10, row: 'mid', range: 'reach', up: ['agi', 'luk', 'vis'], down: ['tea', 'lea', 'con'],
    core: ['agi', 'luk', 'vis', 'dex', 'gen'], sub: ['jud', 'com', 'str', 'sta', 'int', 'ada'],
    plus: '단일 암살, 함정 해제 +30%', minus: '보스에게 피해 ×0.8, 지시 무시 경향',
    weapons: ['dagger'], skills: ['backstab'], sprite: 'rogue' },
  lancer: { name: '창술사', tier: 1, w: 9, row: 'mid', range: 'reach', up: ['str', 'agi', 'jud'], down: ['mag', 'rec', 'int'],
    core: ['str', 'agi', 'jud', 'con', 'dex'], sub: ['sta', 'vis', 'com', 'tea', 'gen', 'rec'],
    plus: '중열에서도 정상 피해, 관통 공격', minus: '부상 회복 ×0.8, 마법 방어 ×0.85',
    weapons: ['spear'], skills: ['pierce'], sprite: 'knight' },
  elementalist: { name: '정령사', tier: 1, w: 8, row: 'mid', range: 'ranged', up: ['mag', 'vis', 'tea'], down: ['str', 'con', 'sta'],
    core: ['mag', 'vis', 'tea', 'int', 'com'], sub: ['rec', 'jud', 'cns', 'agi', 'dex', 'sta'],
    plus: '속성 딜, 파티 환경 페널티 −50%', minus: '구역별 성능 편차(중층 ×1.15 / 심층 ×0.85), HP ×0.9',
    weapons: ['staff'], skills: ['spiritBolt'], sprite: 'mage' },
  bard: { name: '음유시인', tier: 1, w: 7, row: 'back', range: 'ranged', up: ['lea', 'tea', 'com'], down: ['str', 'mag', 'con'],
    core: ['lea', 'tea', 'com', 'int', 'ada'], sub: ['vis', 'jud', 'luk', 'dex', 'agi', 'cns'],
    plus: '긴장 하락과 공격 버프 (용기의 노래)', minus: '직접 피해 ×0.5',
    weapons: ['lute', 'dagger'], skills: ['songCourage'], sprite: 'priest' },
  berserker: { name: '광전사', tier: 1, w: 3, rare: true, row: 'front', range: 'melee', up: ['str', 'con', 'rec'], down: ['com', 'jud', 'ada'],
    core: ['str', 'con', 'rec', 'agi', 'sta'], sub: ['dex', 'gen', 'tea', 'vis', 'jud', 'luk'],
    plus: '체력이 낮을수록 공격력 급증 (최대 +60%)', minus: '호전성 +5(불복종), 부상 확률 +30%',
    weapons: ['axe', 'greatsword'], skills: ['frenzy'], sprite: 'swordsman' },
  hunter: { name: '사냥꾼', tier: 1, w: 8, row: 'mid', range: 'ranged', up: ['vis', 'agi', 'luk'], down: ['mag', 'str', 'lea'],
    core: ['vis', 'agi', 'luk', 'dex', 'jud'], sub: ['sta', 'str', 'com', 'int', 'ada', 'gen'],
    plus: '함정 차단, 전리품 +20%', minus: '보스에게 피해 ×0.8',
    weapons: ['bow', 'dagger'], skills: ['markPrey'], sprite: 'archer' },
  alchemist: { name: '연금술사', tier: 1, w: 6, row: 'mid', range: 'ranged', up: ['int', 'jud', 'dex'], down: ['str', 'con', 'sta'],
    core: ['int', 'jud', 'dex', 'mag', 'com'], sub: ['rec', 'luk', 'vis', 'cns', 'gen', 'ada'],
    plus: '폭발물(광역), 물약 효율 +50%', minus: '화염병마다 재료비 15골드, HP ×0.9',
    weapons: ['flask', 'dagger'], skills: ['firebomb'], sprite: 'rogue' },
  warlock: { name: '흑마법사', tier: 1, w: 3, rare: true, row: 'back', range: 'ranged', up: ['mag', 'int', 'cns'], down: ['tea', 'com', 'rec'],
    core: ['mag', 'int', 'cns', 'com', 'jud'], sub: ['gen', 'vis', 'rec', 'dex', 'sta', 'lea'],
    plus: '언데드 소환 탱킹, 저주 디버프', minus: '파티 팀워크 −2 오라',
    weapons: ['staff'], skills: ['raiseDead', 'curse'], sprite: 'mage' },
  spellblade: { name: '마검사', tier: 2, w: 0, row: 'mid', range: 'reach', up: ['mag', 'str', 'jud'], down: ['luk', 'rec', 'tea'],
    core: ['mag', 'str', 'jud', 'dex', 'agi'], sub: ['int', 'con', 'com', 'vis', 'gen', 'sta'],
    plus: '물리·마법 방어 중 약한 쪽을 공략', minus: '유지비가 커서 주급 ×1.4',
    weapons: ['sword'], skills: ['spellBlade'], sprite: 'swordsman',
    req: { str: 12, mag: 12, jud: 10 }, reqText: '근력 12 · 마력 12 · 판단력 10 (훈련장 2단계)' },
  monk: { name: '무투가', tier: 2, w: 0, row: 'front', range: 'melee', up: ['agi', 'con', 'com'], down: ['mag', 'int', 'dex'],
    core: ['agi', 'con', 'com', 'str', 'jud'], sub: ['sta', 'rec', 'vis', 'gen', 'tea', 'ada'],
    plus: '회피 탱커(회피 +10), 연타·기절로 진형 붕괴', minus: '방어구 효율 ×0.5, 마법 방어 ×0.85',
    weapons: ['knuckle'], skills: ['flurry'], sprite: 'rogue',
    req: { agi: 13, con: 12, com: 11 }, reqText: '민첩성 13 · 체력 12 · 침착성 11 (훈련장 2단계)' }
};
G.D.CLASS_ORDER = ['swordsman', 'archer', 'priest', 'knight', 'mage', 'rogue', 'lancer', 'elementalist', 'bard', 'berserker', 'hunter', 'alchemist', 'warlock', 'spellblade', 'monk'];
G.D.MAGIC_CLASSES = ['priest', 'mage', 'elementalist', 'warlock', 'spellblade']; // 천무지체·마나 무감각 불가

// ───────────── 스킬 ─────────────
G.D.SKILLS = {
  powerStrike: { name: '강타', cd: 3, mp: 0, kind: 'phys', mult: 1.7, desc: '단일 대상 물리 ×1.7' },
  aimedShot: { name: '조준 사격', cd: 3, mp: 0, kind: 'phys', mult: 1.5, ignoreEva: 0.5, desc: '회피 50% 무시, ×1.5' },
  heal: { name: '치유', cd: 2, mp: 6, kind: 'heal', desc: '체력 비율이 가장 낮은 아군 회복' },
  purify: { name: '정화', cd: 5, mp: 8, kind: 'purify', desc: '파티 긴장 −2, 독·출혈 제거' },
  taunt: { name: '도발', cd: 4, mp: 0, kind: 'taunt', desc: '2턴간 적 공격을 끌어오고 방어 +30%' },
  fireball: { name: '화염 폭발', cd: 3, mp: 10, kind: 'magAoe', mult: 0.85, desc: '적 전체 마법 ×0.85' },
  backstab: { name: '급소 찌르기', cd: 3, mp: 0, kind: 'phys', mult: 1.6, crit: 40, desc: '치명타 +40%, ×1.6' },
  pierce: { name: '관통 찌르기', cd: 3, mp: 0, kind: 'pierce', mult: 1.3, desc: '대상과 같은 줄 뒤의 적까지 ×1.3' },
  spiritBolt: { name: '정령탄', cd: 2, mp: 6, kind: 'mag', mult: 1.35, desc: '단일 마법 ×1.35 (속성)' },
  songCourage: { name: '용기의 노래', cd: 4, mp: 6, kind: 'song', desc: '파티 긴장 −2, 공격 +15% (3턴)' },
  frenzy: { name: '분노 일격', cd: 3, mp: 0, kind: 'phys', mult: 2.0, selfDmg: 0.08, desc: '×2.0, 자신 HP −8%' },
  markPrey: { name: '약점 표시', cd: 4, mp: 0, kind: 'mark', mult: 1.0, desc: '대상 받는 피해 +25% (3턴) + 사격' },
  firebomb: { name: '화염병', cd: 3, mp: 0, kind: 'bomb', mult: 0.9, cost: 15, desc: '적 전체 ×0.9 (재료비 15G)' },
  raiseDead: { name: '시체 소환', cd: 5, mp: 10, kind: 'summon', desc: '전열에 언데드 미끼 소환' },
  curse: { name: '저주', cd: 3, mp: 6, kind: 'curse', desc: '대상 공격력 −25% (3턴)' },
  spellBlade: { name: '마검', cd: 3, mp: 5, kind: 'spellblade', mult: 1.5, desc: '물리·마법 방어 중 약한 쪽으로 ×1.5' },
  flurry: { name: '연타', cd: 3, mp: 0, kind: 'flurry', mult: 0.75, desc: '×0.75 2회, 25% 기절' }
};

// ───────────── 특성 ─────────────
// type: unique(태생 고유) / race(종족 전용) / general(후천 일반) / growth(성장 계열 일반) / special
// pts: 생성 시 점수 예산(+ 좋은 특성, − 나쁜 특성), cost: 일반 특성 습득 시 쓰는 어빌(잠재력 소비)
G.D.TRAITS = {
  // 고유 특성 15 (+창립 멤버)
  martialBody: { name: '천무지체', type: 'unique', pts: 4, desc: '무기 장착 시 근력·민첩성 ×1.5. 마법 스킬 습득 불가(마법 직업 불가).' },
  manaVoid: { name: '마나 무감각', type: 'unique', pts: 2, desc: '마력 0 고정. 받는 마법 피해 −70%. 마법 직업 불가.' },
  genius: { name: '천재', type: 'unique', pts: 4, desc: '천재성 매우 높음. 전직 페널티 기간 1/3, 성장 +10%.' },
  glassBody: { name: '유리몸', type: 'unique', pts: 1, desc: '공격 스탯(근력·마력·손재주·민첩)은 잠재력 상한을 받지 않음. 부상 빈도 최대 고정.' },
  cursedChild: { name: '불운의 아이', type: 'unique', pts: 0, desc: '운 0 고정, 함정을 밟을 확률 2배. 승리 시 실전 경험 1.5배 독식.' },
  pirate: { name: '해적', type: 'unique', pts: 1, story: 'pirateDebt', desc: '호전성·근력 높음. 중층부(늪·침수) 전투력 +15%. 기사·사제와 같은 파티면 팀워크 하락.' },
  mentor: { name: '스승', type: 'unique', pts: 2, story: 'mentorPupil', desc: '본인 성장 정지. 같은 파티원의 실전 경험 +20%, 길드 잔류 시 훈련 +20%.' },
  veteran: { name: '베테랑', type: 'unique', pts: 2, story: 'veteranLast', desc: '초기 스탯 높고 침착성 최대. 노화가 5년 일찍 오고 잠재력이 낮다.' },
  fieldMedic: { name: '야전 의사', type: 'unique', pts: 3, story: 'medicSave', desc: '탐험당 1회, 사망 판정을 HP 1 생존으로 바꾼다.' },
  porter: { name: '짐꾼 출신', type: 'unique', pts: 2, desc: '체력·지구력 높음. 파티 지구력 소모 −10%, 소모품 휴대 +4.' },
  fallenNoble: { name: '몰락 귀족', type: 'unique', pts: 1, story: 'nobleRestore', desc: '리더십 매우 높음. 주급 2배, 주급이 밀리면 즉시 탈퇴.' },
  inquisitor: { name: '이단 심문관', type: 'unique', pts: 1, story: 'inquisitorHunt', desc: '언데드·악마형에게 피해 ×2. 파티에 마족·흑마법사가 있으면 전투 시작 시 10% 확률로 아군 공격.' },
  spiritFriend: { name: '정령의 친구', type: 'unique', pts: 2, desc: '미궁 환경 페널티(늪·어둠 등) 무시.' },
  ironStomachU: { name: '강철 위장', type: 'unique', pts: 1, desc: '상한 음식·독초 페널티 없음, 야영지 회복 +.' },
  agoraphobia: { name: '광장공포증', type: 'unique', pts: -2, desc: '좁은 통로 전투 회피 +10, 넓은 방(보스방) 긴장 급증.' },
  founder: { name: '창립 멤버', type: 'special', pts: 0, desc: '주급 없음, 탈퇴하지 않음. 같은 파티원의 팀워크가 떨어지지 않음. 사망 시 전원 긴장 폭증·명성 하락.' },
  // 종족 전용
  versatile: { name: '다재다능', type: 'race', desc: '전직 페널티 기간 절반.' },
  pioneer: { name: '개척자', type: 'race', desc: '상층부(1~10층) 긴장 상승 절반.' },
  manaAffinity: { name: '마나 친화', type: 'race', desc: '마법 계열 일반 특성 습득 어빌 절반.' },
  arrogance: { name: '오만함', type: 'race', desc: '드워프·마족과 같은 파티면 양쪽 모두 긴장 상승 +50%.' },
  craftsman: { name: '장인정신', type: 'race', desc: '착용 장비의 수치 ×1.2.' },
  ironStomach: { name: '강철 위장', type: 'race', desc: '독·상한 식량 페널티 무시, 야영지 회복 +.' },
  bloodlust: { name: '피의 갈망', type: 'race', desc: '적 처치 시 HP 8%·긴장 −1 회복. 전투 없는 방이 이어지면 긴장 폭증.' },
  miasma: { name: '마기 발산', type: 'race', desc: '같은 파티 인간·엘프의 부상 확률 소폭 증가.' },
  packHunt: { name: '무리 사냥', type: 'race', desc: '파티의 근접 직업 1명당 공격력 +5%.' },
  nightCat: { name: '야행성', type: 'race', desc: '어두운 구역에서 시야·민첩 +20%.' },
  supple: { name: '유연함', type: 'race', desc: '기습 무효, 치명타 피격 시 부상 확률 대폭 감소.' },
  hibernate: { name: '동면', type: 'race', desc: '귀환 시 경상 즉시 완치.' },
  thickHide: { name: '두꺼운 가죽', type: 'race', desc: '물리 방어력 +20%.' },
  scout: { name: '정찰', type: 'race', desc: '층에 들어서면 모든 방의 종류를 미리 확인.' },
  dragonScale: { name: '용의 비늘', type: 'race', desc: '방어력 +15%, 화염 피해 −50%.' },
  selfRighteous: { name: '독선', type: 'race', desc: '주장의 CA가 자신보다 낮으면 매 행동 긴장 +0.3.' },
  emotionless: { name: '감정 소거', type: 'race', desc: '어떤 사건에도 긴장이 변하지 않음. 침착성 20 고정, 운 1 고정.' },
  manastoneCore: { name: '마석 동력', type: 'race', desc: '야영 시 식량 대신 마석으로 지구력 완전 회복.' },
  windBlessing: { name: '바람의 가호', type: 'race', desc: '전투 시작 후 첫 2회 공격을 무조건 회피.' },
  fragile: { name: '개복치', type: 'race', desc: '치명타 피격 시 영구 손상·사망 확률 대폭 상승.' },
  regeneration: { name: '초재생능력', type: 'race', desc: '전투 후 잃은 HP 30% 회복, 경상 자연 치유 2배.' },
  coldBlood: { name: '냉혈', type: 'race', desc: '사제·음유시인의 멘탈 케어 효율 절반.' },
  // 후천 일반 특성 18
  weaponMastery: { name: '무기 숙련', type: 'general', pts: 1, cost: 3, desc: '직업 주무기 착용 시 손재주 +3.' },
  dualWield: { name: '쌍검술', type: 'general', pts: 1, cost: 4, desc: '행동 속도 ×1.3, 방어력 −20% (근접 직업).' },
  executioner: { name: '처형인', type: 'general', pts: 2, cost: 5, desc: '적 HP 30% 이하일 때 판단력×1.5% 확률 즉사.' },
  ironWall: { name: '철벽', type: 'general', pts: 2, cost: 4, desc: '방패 장착 시 체력 +2, 아군 대상 원거리 공격 30% 대신 맞음.' },
  manaControl: { name: '마력 갈무리', type: 'general', pts: 1, cost: 3, magic: true, desc: '스킬 마나 소모 절반, 스킬 남발 시 긴장 상승 없음.' },
  cooking: { name: '요리', type: 'general', pts: 2, cost: 2, desc: '야영 시 파티 긴장 −3 추가, 지구력 회복 +20%.' },
  firstAid: { name: '치유력', type: 'general', pts: 2, cost: 3, desc: '전투 후 출혈·독 정지, 귀환 시 부상 악화 방지.' },
  direction: { name: '방향 감각', type: 'general', pts: 1, cost: 2, desc: '길 잃음 이벤트 차단, 파티 지구력 소모 −25%.' },
  trapper: { name: '덫 사냥꾼', type: 'general', pts: 2, cost: 3, desc: '함정 100% 발견·해체.' },
  nocturnal: { name: '야행성', type: 'general', pts: 1, cost: 2, desc: '어두운 구역에서 시야·민첩 +20%.' },
  neatFreak: { name: '깔끔쟁이', type: 'general', pts: -1, desc: '피·진흙에 긴장 2배. 여관 3단계(목욕탕) 없으면 귀환 후 긴장 회복 절반.' },
  drinker: { name: '애주가', type: 'general', pts: -1, desc: '탐험 중 술이 없으면 판단력 −3. 술을 마시면 공포(긴장 패닉) 면역.' },
  chatterbox: { name: '수다쟁이', type: 'general', pts: 0, desc: '야영 시 파티 팀워크 +1(그 탐험 동안), 기습당할 확률 +10%.' },
  perfectionist: { name: '완벽주의자', type: 'general', pts: 1, cost: 2, desc: '명중이 확실할 때만 스킬 사용, 꾸준함 +3.' },
  hothead: { name: '다혈질', type: 'general', pts: -2, desc: '피격 시 호전성 급증 → 진형 이탈 돌진.' },
  optimist: { name: '낙천주의자', type: 'general', pts: 2, cost: 2, desc: '아군 치명상·사망을 봐도 긴장이 오르지 않음.' },
  miser: { name: '구두쇠', type: 'general', pts: 0, desc: '강한 스킬을 아낌(스킬 빈도 한 단계 낮음). 주급 ×0.7.' },
  weatherSense: { name: '기상 예측', type: 'general', pts: 0, cost: 1, desc: '다음 층의 환경 변화를 미리 경고.' },
  // 성장 계열 일반 특성 (장단점 한 쌍)
  hardWorker: { name: '노력파', type: 'growth', pts: 2, cost: 3, desc: '훈련 성장 +20%, 훈련 부상 확률 +20%.' },
  lateBloomer: { name: '대기만성', type: 'growth', pts: 1, desc: '28세 이후 성장 ×1.3, 노화 5년 지연. 27세까지 성장 ×0.8.' },
  observer: { name: '관찰자', type: 'growth', pts: 1, cost: 2, desc: '같은 직업의 더 강한 용병이 있으면 그 직업 핵심 스탯 성장 +15%.' },
  fieldLearner: { name: '실전파', type: 'growth', pts: 1, cost: 2, desc: '실전 경험 성장 ×2, 훈련장 성장 −15%.' },
  singleMinded: { name: '외골수', type: 'growth', pts: -1, desc: '훈련 스탯 1개만 가능, 그 스탯 성장 ×1.5. 전직 페널티 기간 ×2.' },
  lazy: { name: '게으름뱅이', type: 'growth', pts: -2, desc: '주급 ×0.8, 훈련 성장 −20%.' }
};
G.D.UNIQUE_POOL = ['martialBody', 'manaVoid', 'genius', 'glassBody', 'cursedChild', 'pirate', 'mentor', 'veteran', 'fieldMedic', 'porter', 'fallenNoble', 'inquisitor', 'spiritFriend', 'ironStomachU', 'agoraphobia'];
G.D.GENERAL_POOL = ['weaponMastery', 'dualWield', 'executioner', 'ironWall', 'manaControl', 'cooking', 'firstAid', 'direction', 'trapper', 'nocturnal', 'neatFreak', 'drinker', 'chatterbox', 'perfectionist', 'hothead', 'optimist', 'miser', 'weatherSense', 'hardWorker', 'lateBloomer', 'observer', 'fieldLearner', 'singleMinded', 'lazy'];

// ───────────── 개인 서사 ─────────────
G.D.STORIES = {
  pirateDebt: { name: '해적의 빚', goal: '마석 30개를 갚는다 (길드 화면에서 납부)', reward: '해적 특성의 팀워크 페널티 해제', kind: 'payStones', need: 30 },
  mentorPupil: { name: '후배 육성', goal: '지정된 후배의 CA를 100까지 키운다', reward: '스승 보너스 +20% → +35%', kind: 'pupil', need: 100 },
  veteranLast: { name: '마지막 전투', goal: '보스 격파에 참여한다', reward: '은퇴 시 특성 1개를 후배에게 계승', kind: 'boss', need: 1 },
  medicSave: { name: '생명의 빚', goal: '사망 직전의 동료 3명을 구한다', reward: '일반 특성 [치유력]', kind: 'save', need: 3 },
  nobleRestore: { name: '가문 재건', goal: '누적 주급 1500G 지급 후 15층 도달', reward: '리더십 +2, 주급 2배 → 1배', kind: 'noble', need: 1500 },
  inquisitorHunt: { name: '이단 사냥', goal: '언데드·악마형 40마리 처치', reward: '아군 공격 확률 제거', kind: 'kill', need: 40 },
  homeMoney: { name: '고향 송금', goal: '고향에 800G를 보낸다 (길드 화면에서 송금)', reward: '잠재력 +8', kind: 'payGold', need: 800 },
  lostSibling: { name: '실종된 동생', goal: '11층 이후 미궁 사건에서 단서를 찾는다', reward: '잠재력 +5, 일반 특성 [낙천주의자]', kind: 'event', need: 1 },
  honor: { name: '명예 회복', goal: '정예 전투 3회 승리에 참여한다', reward: '침착성 +2', kind: 'elite', need: 3 },
  training: { name: '수련', goal: '직업 핵심 스탯 하나를 15까지 올린다', reward: '일반 특성 [무기 숙련]', kind: 'stat15', need: 15 },
  // 창립 멤버 동기
  founderDebt: { name: '빚 청산', goal: '빚 5000G를 갚는다 (길드 화면에서 상환)', reward: '침착성 +2, 명성 +40', kind: 'payGold', need: 5000 },
  founderRevenge: { name: '복수', goal: '30층 환술사를 쓰러뜨린다', reward: '천재성 +2, 일반 특성 [처형인]', kind: 'bossId', bossId: 'illusionist', need: 1 },
  founderDream: { name: '동경', goal: '창립 멤버가 살아서 20층에 도달하고 CA 120을 넘긴다', reward: '리더십 +2, 명성 +60', kind: 'dream', need: 1 }
};
G.D.GENERIC_STORIES = ['homeMoney', 'lostSibling', 'honor', 'training'];

// ───────────── 장비 ─────────────
G.D.GRADES = [
  { name: '일반', opts: 0, mult: 1.0, color: '#b9b4a8' },
  { name: '마법', opts: 1, mult: 1.15, color: '#6fa8dc' },
  { name: '희귀', opts: 2, mult: 1.3, color: '#e1c34f' },
  { name: '영웅', opts: 3, mult: 1.5, color: '#c27ce6' },
  { name: '전설', opts: 4, mult: 1.75, color: '#ef8a3c' }
];
// atk/mat: 무기 공격·마공 계수, def/mdef: 방어 계수, w: 무게
G.D.WEAPONS = {
  sword: { name: '검', atk: 1.0, mat: 0, w: 2.5 },
  greatsword: { name: '대검', atk: 1.35, mat: 0, w: 6, pen: 10 },
  swordShield: { name: '검과 방패', atk: 0.85, mat: 0, w: 6, def: 0.5, shield: true },
  dagger: { name: '단검', atk: 0.8, mat: 0, w: 1, crit: 8 },
  bow: { name: '활', atk: 1.0, mat: 0, w: 2 },
  staff: { name: '지팡이', atk: 0.3, mat: 1.1, w: 1.5 },
  mace: { name: '메이스', atk: 0.8, mat: 0.6, w: 3 },
  spear: { name: '창', atk: 1.1, mat: 0, w: 4 },
  axe: { name: '도끼', atk: 1.3, mat: 0, w: 5 },
  lute: { name: '류트', atk: 0.4, mat: 0.8, w: 2 },
  flask: { name: '투척 플라스크', atk: 0.6, mat: 0.7, w: 2 },
  knuckle: { name: '너클', atk: 0.95, mat: 0, w: 1 }
};
G.D.ARMORS = {
  plate: { name: '판금 갑옷', def: 1.0, mdef: 0.3, w: 10 },
  leather: { name: '가죽 갑옷', def: 0.55, mdef: 0.45, w: 4, eva: 4 },
  robe: { name: '로브', def: 0.25, mdef: 0.9, w: 1.5, mag: 1 }
};
G.D.ACCS = {
  ring: { name: '반지' }, amulet: { name: '목걸이' }
};
G.D.OPTIONS = {
  sharp: { name: '날카로운', desc: '치명타 +6%', crit: 6 },
  heavy: { name: '묵직한', desc: '방어 관통 +15%', pen: 15 },
  manaFusion: { name: '마나 융합', desc: '마법 공격력의 40%를 물리 공격력에 더함', fusion: 0.4 },
  vampiric: { name: '흡혈', desc: '가한 피해의 8% 회복', leech: 0.08 },
  commander: { name: '지휘관의', desc: '리더십 +2, 팀워크 +2', stat: { lea: 2, tea: 2 } },
  calm: { name: '평정심', desc: '긴장 상승 −40%', calm: 0.4 },
  tireless: { name: '불굴', desc: '지구력 소모 −20%', staSave: 0.2 },
  owl: { name: '올빼미의', desc: '어둠 페널티 무시, 시야 +2', owl: true, stat: { vis: 2 } },
  lucky: { name: '행운의', desc: '운 +2, 사망 확률 −30%', stat: { luk: 2 }, deathCut: 0.3 },
  regen: { name: '재생의', desc: '턴당 HP 재생 +3', regen: 3 },
  sturdy: { name: '견고한', desc: '방어력 +12%', defPct: 12 },
  swift: { name: '신속한', desc: '행동 속도 +8%', spd: 8 },
  strong: { name: '힘의', desc: '근력 +2', stat: { str: 2 } },
  wise: { name: '현자의', desc: '지능 +2, 마력 +1', stat: { int: 2, mag: 1 } }
};
G.D.CURSED = {
  bloodthirsty: { name: '피에 굶주린', desc: '공격력 +50%, 매 행동 호전성 +2 (통제 불능 위험)', cursed: true, atkPct: 50, aggUp: 2 },
  ruinous: { name: '파멸의', desc: '마법 공격력 ×2, 스킬 사용 시 파티 팀워크 −1·긴장 +1', cursed: true, matMul: 2 },
  leaden: { name: '납으로 된', desc: '물리 방어 ×2, 무게 ×3', cursed: true, defMul: 2, wMul: 3 }
};
G.D.UNIQUES = {
  inqMace: { name: '이단심문관의 횃불 철퇴', slot: 'weapon', wtype: 'mace', grade: 4, desc: '화염 피해, 어둠 속에서도 시야 확보, 언데드 타격 시 확정 치명타.', fx: { owl: true, undeadCrit: true, fire: true } },
  butcherApron: { name: '처형인의 피 묻은 가죽 앞치마', slot: 'armor', atype: 'leather', grade: 4, desc: '호전성 +4, 처형 확률 +10%. 파티의 사제·엘프 팀워크 −2.', fx: { agg: 4, exec: 10, apron: true } },
  brokenCompass: { name: '부서진 나침반', slot: 'acc', grade: 3, desc: '방 종류가 전혀 보이지 않음. 대신 실전 경험 2배.', fx: { compass: true } },
  oathRing: { name: '맹세의 반지', slot: 'acc', grade: 3, desc: '착용자 팀워크 20 고정. 같은 반지 착용자가 치명타를 맞으면 피해 절반을 대신 받음.', fx: { oath: true } }
};
// 유물: 길드 보유(최대 3개 장착)만으로 효과
G.D.RELICS = {
  tomeExp: { name: '경험의 서', desc: '실전 경험 성장 ×2', price: 5200 },
  graal: { name: '정화의 성배', desc: '독·출혈 면역', price: 3800 },
  owlFeather: { name: '올빼미 깃털', desc: '어둠 페널티 제거', price: 3000 },
  goldScale: { name: '황금 저울', desc: '전리품 +30%', price: 4200 },
  bondKnot: { name: '결속의 매듭', desc: '탐험 중 팀워크 최소 12', price: 3600 },
  braveBanner: { name: '용기의 깃발', desc: '긴장 상승 −30%', price: 4000 },
  wardCharm: { name: '수호의 부적', desc: '사망 확률 −50%', price: 5600 },
  stoneHeart: { name: '마석 심장', desc: '최대 지구력 +30%', price: 3200 },
  luckyDice: { name: '행운의 주사위', desc: '파티 운 +3', price: 3400 },
  ancientMap: { name: '고대 지도', desc: '모든 방 종류 공개', price: 2600 },
  phoenix: { name: '불사조 깃털', desc: '탐험마다 1회 전멸 직전 전원 HP 30% 부활', price: 6200 },
  warDrum: { name: '전쟁 북', desc: '파티 행동 속도 +10%', price: 3600 },
  founderSeal: { name: '창립자의 인장', desc: '창립 멤버의 유품. 파티 침착성 +2', price: 1, noSell: true }
};
// 소모품
G.D.CONSUMABLES = {
  potion: { name: '체력 물약', desc: 'HP 40% 회복 (복용선 지시에 따라 자동)', price: 60 },
  calmPotion: { name: '정신 안정 물약', desc: '야영 시 파티 긴장 −3', price: 90 },
  antidote: { name: '해독제', desc: '전투 후 독·출혈 제거', price: 40 },
  torch: { name: '횃불', desc: '어두운 층에서 방 1개 밝힘 (심층부 필수)', price: 12 },
  ration: { name: '식량', desc: '야영 시 지구력 회복 (+40%)', price: 15 },
  ale: { name: '술', desc: '야영 시 긴장 −1, 애주가 필수', price: 20 }
};
G.D.HERBS = { herb: { name: '약초', price: 10 } };
// 재능 무시 스탯 상승 물약: 특정 특성이 있어야 사용 가능
G.D.STAT_ITEMS = {
  giantBlood: { name: '거인의 피', stat: 'str', req: ['martialBody', 'porter', 'thickHide', 'dragonScale'], desc: '근력 +1 (잠재력 무시)' },
  windEssence: { name: '바람의 정수', stat: 'agi', req: ['windBlessing', 'supple', 'nightCat', 'nocturnal'], desc: '민첩성 +1 (잠재력 무시)' },
  manaCrystal: { name: '마나 결정', stat: 'mag', req: ['manaAffinity', 'spiritFriend', 'manaControl'], desc: '마력 +1 (잠재력 무시)' },
  sageTea: { name: '현자의 차', stat: 'int', req: ['genius', 'perfectionist', 'weatherSense'], desc: '지능 +1 (잠재력 무시)' },
  oxHeart: { name: '황소의 심장', stat: 'con', req: ['ironStomach', 'ironStomachU', 'regeneration', 'hibernate'], desc: '체력 +1 (잠재력 무시)' },
  monkIncense: { name: '고승의 향', stat: 'com', req: ['emotionless', 'optimist', 'veteran', 'coldBlood'], desc: '침착성 +1 (잠재력 무시)' }
};
// 스킬북: 일반 특성을 가르친다 (어빌 소비)
G.D.SKILLBOOK_TRAITS = ['weaponMastery', 'dualWield', 'executioner', 'ironWall', 'manaControl', 'cooking', 'firstAid', 'direction', 'trapper', 'nocturnal', 'perfectionist', 'optimist', 'observer', 'hardWorker'];

// ───────────── 몬스터 ─────────────
// hp/atk/def/mdef/spd/eva: 층별 기준치 배수, kind: phys/mag, range: melee/ranged, tags: undead/demon/beast
G.D.MONSTERS = {
  rat: { name: '거대 쥐', sprite: 'mon_rat', hp: 0.6, atk: 0.7, def: 0.6, mdef: 0.6, spd: 1.2, eva: 1.1, range: 'melee', tags: ['beast'], zone: 'upper' },
  spider: { name: '동굴 거미', sprite: 'mon_spider', hp: 0.75, atk: 0.85, def: 0.8, mdef: 0.8, spd: 1.35, eva: 1.2, range: 'melee', tags: ['beast'], poison: 0.25, zone: 'upper' },
  skeleton: { name: '해골 병사', sprite: 'mon_skeleton', hp: 1.1, atk: 1.0, def: 1.3, mdef: 0.9, spd: 0.9, eva: 0.7, range: 'melee', tags: ['undead'], zone: 'upper' },
  skelArcher: { name: '해골 궁수', sprite: 'mon_skel_archer', hp: 0.8, atk: 1.05, def: 0.9, mdef: 0.9, spd: 1.0, eva: 0.9, range: 'ranged', prefer: 'back', tags: ['undead'], zone: 'upper' },
  slime: { name: '슬라임', sprite: 'mon_slime', hp: 1.4, atk: 0.7, def: 0.5, mdef: 1.4, spd: 0.7, eva: 0.5, range: 'melee', tags: ['beast'], zone: 'upper' },
  goblin: { name: '고블린', sprite: 'icon:goblin', hp: 0.85, atk: 0.95, def: 0.8, mdef: 0.7, spd: 1.1, eva: 1.0, range: 'melee', tags: ['beast'], zone: 'upper' },
  goblinArcher: { name: '고블린 궁수', sprite: 'icon:goblin_archer', hp: 0.7, atk: 1.0, def: 0.7, mdef: 0.7, spd: 1.1, eva: 1.0, range: 'ranged', prefer: 'back', tags: ['beast'], zone: 'upper' },
  bat: { name: '흡혈 박쥐 떼', sprite: 'icon:bat', hp: 0.7, atk: 0.8, def: 0.6, mdef: 0.8, spd: 1.5, eva: 1.6, range: 'melee', tags: ['beast'], leech: 0.3, zone: 'mid' },
  mushroom: { name: '독버섯 괴물', sprite: 'icon:mushroom', hp: 1.2, atk: 0.8, def: 1.0, mdef: 1.1, spd: 0.8, eva: 0.6, range: 'ranged', kind: 'mag', tags: ['beast'], spore: 1.2, zone: 'mid' },
  poisonSpider: { name: '독거미', sprite: 'icon:poison_spider', hp: 0.9, atk: 0.95, def: 0.9, mdef: 0.9, spd: 1.3, eva: 1.2, range: 'melee', tags: ['beast'], poison: 0.45, zone: 'mid' },
  swampWraith: { name: '늪지 망령', sprite: 'icon:swamp_wraith', hp: 0.9, atk: 1.1, def: 0.7, mdef: 1.4, spd: 1.0, eva: 1.1, range: 'ranged', kind: 'mag', tags: ['undead'], fear: 1.0, zone: 'mid' },
  rotSoldier: { name: '부패한 병사', sprite: 'mon_skeleton', hp: 1.25, atk: 1.05, def: 1.3, mdef: 0.9, spd: 0.85, eva: 0.7, range: 'melee', tags: ['undead'], poison: 0.2, zone: 'mid' },
  bogSlime: { name: '독 슬라임', sprite: 'mon_slime', hp: 1.5, atk: 0.8, def: 0.6, mdef: 1.4, spd: 0.7, eva: 0.5, range: 'melee', tags: ['beast'], poison: 0.35, zone: 'mid' },
  golem: { name: '석골렘', sprite: 'icon:golem', hp: 1.8, atk: 1.15, def: 1.9, mdef: 1.2, spd: 0.65, eva: 0.3, range: 'melee', tags: [], zone: 'deep' },
  shadow: { name: '그림자 크리처', sprite: 'icon:swamp_wraith', hp: 0.9, atk: 1.25, def: 0.8, mdef: 1.1, spd: 1.4, eva: 1.5, range: 'melee', prefer: 'back', tags: ['demon'], fear: 1.5, zone: 'deep' },
  arenaWraith: { name: '투기장 망령', sprite: 'icon:skeleton', hp: 1.1, atk: 1.2, def: 1.0, mdef: 1.3, spd: 1.1, eva: 1.0, range: 'melee', tags: ['undead'], fear: 1.0, zone: 'deep' },
  executioner: { name: '뒤틀린 집행자', sprite: 'mon_skeleton', hp: 1.5, atk: 1.45, def: 1.3, mdef: 1.0, spd: 0.8, eva: 0.6, range: 'melee', tags: ['demon'], execute: true, zone: 'deep' },
  abyssSpider: { name: '심연 거미', sprite: 'icon:poison_spider', hp: 1.0, atk: 1.1, def: 1.0, mdef: 1.0, spd: 1.35, eva: 1.3, range: 'melee', tags: ['beast'], poison: 0.5, zone: 'deep' },
  boneKnight: { name: '해골 기사', sprite: 'mon_skeleton', hp: 1.4, atk: 1.2, def: 1.6, mdef: 1.0, spd: 0.9, eva: 0.7, range: 'melee', tags: ['undead'], zone: 'deep' },
  // 보스 전용 소환물
  egg: { name: '거미 고치', sprite: 'boss_queen:egg', hp: 0.45, atk: 0, def: 0.5, mdef: 0.5, spd: 0, eva: 0, range: 'none', tags: ['summon'], noAct: true },
  spiderling: { name: '자폭 새끼거미', sprite: 'mon_spider', hp: 0.4, atk: 0.6, def: 0.5, mdef: 0.5, spd: 1.6, eva: 1.0, range: 'melee', tags: ['beast', 'summon'], explode: true, small: true },
  rivalMerc: { name: '용병', sprite: 'merc', range: 'melee', tags: ['human'] }
};
G.D.ZONE_MONSTERS = {
  upper: ['rat', 'spider', 'skeleton', 'skelArcher', 'slime', 'goblin', 'goblinArcher'],
  mid: ['bat', 'mushroom', 'poisonSpider', 'swampWraith', 'rotSoldier', 'bogSlime', 'goblinArcher'],
  deep: ['golem', 'shadow', 'arenaWraith', 'executioner', 'abyssSpider', 'boneKnight', 'swampWraith']
};
G.D.ZONES = {
  upper: { name: '상층부 — 이끼 낀 지하 유적', floors: [1, 10], ten: 1.0, sta: 1.0, deathBase: 0.10 },
  mid: { name: '중층부 — 맹독 늪지와 침수된 신전', floors: [11, 30], ten: 1.4, sta: 1.6, deathBase: 0.14, swamp: true },
  deep: { name: '심층부 — 칠흑의 심연과 유혈의 투기장', floors: [31, 40], ten: 2.0, sta: 1.3, deathBase: 0.18, dark: true }
};
// 보스: 패턴은 적게, 기믹 중심 (전술판·로스터로 파훼)
G.D.BOSSES = {
  queen: { floor: 10, name: '맹독의 여왕거미', sprite: 'boss_queen', hp: 10, atk: 0.95, def: 1.1, mdef: 1.0, spd: 0.9, eva: 0.5,
    gimmick: '매 턴 고치를 낳는다. 3턴 안에 부수지 않으면 자폭 새끼거미가 부화해 파티의 지구력·긴장을 깎는다.',
    counter: '개별 지시 타겟팅을 "소환물 우선"으로. 판단력·팀워크가 낮으면 지시를 무시하고 본체만 때린다.' },
  guardian: { floor: 20, name: '가라앉은 신전의 수문장', sprite: 'ui:boss_guardian', hp: 9, atk: 1.55, def: 2.2, mdef: 1.2, spd: 0.85, eva: 0.4,
    gimmick: '전열을 무시하고 HP가 가장 낮거나 후열에 있는 용병에게 돌진한다. 방패로 정면 피해 −40%.',
    counter: '중열에 호전성·민첩이 높은 용병을 두어 돌진을 몸으로 끊는다. 교전 기조는 "방어적 진형 유지".' },
  illusionist: { floor: 30, name: '심연을 들여다보는 환술사', sprite: 'ui:boss_illusionist', hp: 13, atk: 1.15, def: 1.0, mdef: 1.8, spd: 1.1, eva: 1.2,
    gimmick: '물리 피해는 약하다. 파티 전체 긴장을 폭발적으로 올리고 팀워크를 일시적으로 0으로 만든다. 패닉에 빠지면 아군을 공격한다.',
    counter: '침착성이 높은 용병, 음유시인, 호문쿨루스, "평정심" 장비.' },
  archbishop: { floor: 40, name: '부패한 대주교', sprite: 'ui:boss_archbishop', hp: 12, atk: 1.75, def: 1.5, mdef: 1.6, spd: 0.9, eva: 0.6,
    gimmick: '3턴 주기로 치유 반전 오라를 켠다. 그동안 치유 스킬·물약·재생이 모두 피해가 된다.',
    counter: '힐러의 스킬 빈도를 "아끼기"로, 재생 장비 해제, 또는 "무자비한 섬멸"로 오라 전에 끝낸다.' }
};
G.D.BOSS_BY_FLOOR = { 10: 'queen', 20: 'guardian', 30: 'illusionist', 40: 'archbishop' };

// ───────────── 길드 시설 (3단계) ─────────────
G.D.BUILDINGS = {
  office: { name: '길드 사무소', start: 1, img: 'bld_office', cost: [0, [1200, 15, 'D'], [4000, 60, 'B']],
    lv: ['로스터 6명, 지원자 3명, 공고 주 1회, 스카우트 오차 ±30', '로스터 8명, 지원자 4명, 공고 주 2회, 오차 ±18', '로스터 10명, 지원자 5명, 공고 주 3회, 오차 ±8'] },
  training: { name: '훈련장', start: 1, img: 'bld_training', cost: [0, [1000, 10, 'E'], [3600, 50, 'C']],
    lv: ['성장 ×1.0, 동시 3명, 근력·민첩·체력·지구력·손재주', '성장 ×1.2, 동시 5명, +마력·지능·회복력·시야·판단력, 상위 직업 전직', '성장 ×1.4, 동시 10명, +침착성·리더십·팀워크·적응력'] },
  tavern: { name: '주점/여관', start: 1, img: 'bld_tavern', cost: [0, [800, 5, 'E'], [2800, 30, 'C']],
    lv: ['하루 긴장 −0.6', '하루 긴장 −0.9, 연회(전원 긴장 해소)', '하루 긴장 −1.3, 고급 목욕탕(깔끔쟁이 만족)'] },
  infirmary: { name: '의무실/연금술 공방', start: 1, img: 'bld_infirmary', cost: [0, [1000, 10, 'E'], [3400, 45, 'C']],
    lv: ['부상 회복 ×1.0, 체력 물약 제조', '부상 회복 ×1.4, 정신 안정 물약 제조, 부상 빈도 진단', '부상 회복 ×1.8, 해독제 제조, 영구 손상 수술'] },
  cemetery: { name: '추모의 묘지', start: 0, img: 'bld_cemetery', cost: [[500, 0, 'F'], [1200, 10, 'D'], [2600, 25, 'C']],
    lv: ['전사자 안치: 사망 시 팀워크·긴장 충격 절반', '유품 계승: 전사자의 특성·서사를 신입에게', '계승 시 잠재력 +10 추가'] },
  market: { name: '암시장/경매장', start: 0, img: 'bld_market', cost: [[900, 10, 'E'], [2400, 30, 'C'], [5000, 70, 'A']],
    lv: ['암시장: 유물·재능 무시 물약 로테이션', '경매장 개방 (NPC와 입찰 경쟁)', '고급 로테이션 (영웅·전설 등급 확률↑)'] }
};
G.D.BUILDING_ORDER = ['office', 'training', 'tavern', 'infirmary', 'cemetery', 'market'];

// ───────────── 전술 ─────────────
G.D.TEMPO = { careful: { name: '신중한 전진', staMul: 0.8, dayMul: 1.4, trap: 0.25, desc: '시간이 더 들지만 함정 발견↑, 지구력 소모↓' }, normal: { name: '보통', staMul: 1, dayMul: 1, trap: 0, desc: '' }, rush: { name: '전격 돌파', staMul: 1.5, dayMul: 0.7, trap: -0.15, ambushFirst: true, desc: '빠르지만 지구력·멘탈 소모가 극심, 선제 기습 가능' } };
G.D.ENGAGE = { defensive: { name: '방어적 진형 유지', desc: '방어 +20%, 피해 −10%, 진형 이탈 금지' }, balanced: { name: '균형', desc: '' }, ruthless: { name: '무자비한 섬멸', desc: '피해 +20%, 속도 +10%, 방어 −15%, 부상 확률↑' } };
G.D.TARGETS = { nearest: '가장 가까운 적', lowHp: '체력이 가장 낮은 적', back: '후열 우선', boss: '보스 일점사', summon: '소환물 우선' };
G.D.SKILLFREQ = { save: '아끼기', normal: '보통', aggressive: '적극적 사용' };
G.D.POTION = { 0: '물약 금지', 30: 'HP 30% 이하', 50: 'HP 50% 이하' };

// ───────────── 연말 평가 ─────────────
G.D.YEAR_GOALS = [
  { id: 'floor', text: function (v) { return v + '층 도달'; }, gen: function (S) { return Math.min(40, Math.max(S.deepest + 3, Math.floor(S.year * 4.5))); } },
  { id: 'ca', text: function (v) { return '용병 1명 CA ' + v + ' 이상 육성'; }, gen: function (S) { return Math.min(170, Math.round(Math.max(40, S.bestCA + 15) / 5) * 5); } },
  { id: 'gold', text: function (v) { return '올해 순수익 ' + G.fmt(v) + 'G'; }, gen: function (S) { return 1000 + S.year * 600; } },
  { id: 'noDeath', text: function () { return '전사자 없이 한 해 보내기'; }, gen: function () { return 0; } },
  { id: 'boss', text: function (v) { return v + '층 보스 격파'; }, gen: function (S) { var f = (Math.floor(S.deepest / 10) + 1) * 10; return f > 40 ? 0 : f; } },
  { id: 'fame', text: function (v) { return '명성 ' + v + '등급 달성'; }, gen: function (S) { return G.D.FAME[Math.min(6, S.fameIdx + 1)].t; } }
];
G.D.GRADE_REWARD = { S: { fame: 120, gold: 3000, bonus: 'paFloor' }, A: { fame: 80, gold: 2000, bonus: 'slot' }, B: { fame: 50, gold: 1200 }, C: { fame: 25, gold: 600 }, D: { fame: 0, gold: 0 } };

// ───────────── 이름 ─────────────
G.D.NAMES = ['카렐', '이안', '로웬', '세라', '다리안', '에린', '하겔', '미라', '테오', '루카', '바렌', '엘라', '케인', '리온', '노아', '시엘', '가론', '아린', '브람', '체스', '도윈', '에반', '페린', '고드', '헤일', '이브', '조엘', '카라', '라일', '마렌', '닐스', '오렌', '피아', '렌', '사샤', '토린', '울프', '베라', '윈', '자렌', '아델', '보리스', '셀린', '데인', '에스텔', '펠릭스', '그레타', '하이든', '이솔', '야냐', '클라우스', '루시아', '모건', '나디아', '오스카', '프리다', '퀸', '로사', '스벤', '틸다', '우르', '비오', '엘더', '카일', '마야', '레아', '한스', '이그나', '노르', '알마'];
G.D.SURN = ['그레이', '블랙우드', '애쉬', '스톤', '레이븐', '하트', '볼트', '크로우', '파인', '리버', '실버', '던', '모어', '피크', '울프', '로그', '바인', '헤이즈', '노스', '쏜'];
G.D.RIVAL_NAMES = ['흑철 용병단', '은빛 늑대단', '붉은 망치', '새벽의 칼날', '잿빛 까마귀', '황금 사자단'];
G.D.HAIR = ['#4a2e1c', '#2a1d16', '#7a4b2a', '#b98a4a', '#d9c18a', '#8a8a8a', '#c9c9c9', '#7a2a22', '#3a2f5a', '#2e3e2a'];
G.D.CLOTH = ['#4a5a7a', '#6a3a3a', '#3a5a3a', '#5a4a6a', '#6a5a3a', '#3a3a3a', '#2f4f5f', '#7a6a4a'];
G.D.SCOUT_LINES = [
  [170, '눈빛에 심연을 품고 있습니다. 괴물이 될지도 모릅니다.'],
  [150, '역사에 이름을 남길 기재입니다.'],
  [130, '검을 쥐는 폼이 예사롭지 않습니다.'],
  [110, '꾸준히 키우면 1군 감입니다.'],
  [90, '쓸 만한 용병으로 자랄 겁니다.'],
  [70, '성장 폭은 크지 않아 보입니다.'],
  [0, '이미 자기 한계에 도달한 듯합니다.']
];

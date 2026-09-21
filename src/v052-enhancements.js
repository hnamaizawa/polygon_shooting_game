(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolygonStrikeV052 = api;
  if (root.PolygonStrikeCore) api.install(root.PolygonStrikeCore, root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.5.2';
  const STAGES_PER_LOOP = 4;
  const CAMPAIGN_LOOPS = 2;
  const LOOP2_ENEMY_MULTIPLIER = 1.2;
  const LOOP2_BOSS_HP_MULTIPLIER = 1.2;

  function campaignLoop(campaignStage) {
    const n = Math.max(1, Math.floor(Number(campaignStage) || 1));
    return Math.min(CAMPAIGN_LOOPS, Math.floor((n - 1) / STAGES_PER_LOOP) + 1);
  }

  function baseStageNumber(campaignStage) {
    const n = Math.max(1, Math.floor(Number(campaignStage) || 1));
    return ((n - 1) % STAGES_PER_LOOP) + 1;
  }

  function enemyCountMultiplier(loop) {
    return Number(loop) >= 2 ? LOOP2_ENEMY_MULTIPLIER : 1;
  }

  function bossHpMultiplier(loop) {
    return Number(loop) >= 2 ? LOOP2_BOSS_HP_MULTIPLIER : 1;
  }

  function installCanvasPolygonDetail(root) {
    const proto = root && root.CanvasRenderingContext2D && root.CanvasRenderingContext2D.prototype;
    if (!proto || proto.__polygonStrikeV052Facets) return;
    proto.__polygonStrikeV052Facets = true;

    const original = {
      beginPath: proto.beginPath,
      moveTo: proto.moveTo,
      lineTo: proto.lineTo,
      closePath: proto.closePath,
      stroke: proto.stroke,
      save: proto.save,
      restore: proto.restore
    };
    const paths = new WeakMap();

    proto.beginPath = function (...args) {
      paths.set(this, { points: [], closed: false });
      return original.beginPath.apply(this, args);
    };
    proto.moveTo = function (x, y, ...args) {
      const p = paths.get(this); if (p) p.points.push([x, y]);
      return original.moveTo.call(this, x, y, ...args);
    };
    proto.lineTo = function (x, y, ...args) {
      const p = paths.get(this); if (p) p.points.push([x, y]);
      return original.lineTo.call(this, x, y, ...args);
    };
    proto.closePath = function (...args) {
      const p = paths.get(this); if (p) p.closed = true;
      return original.closePath.apply(this, args);
    };
    proto.stroke = function (...args) {
      const tracked = paths.get(this);
      const result = original.stroke.apply(this, args);
      if (!this.__polygonStrikeFacetDrawing && tracked && tracked.closed && tracked.points.length === 3 && Number(this.lineWidth) <= 1.05) {
        const pts = tracked.points;
        const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
        const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
        this.__polygonStrikeFacetDrawing = true;
        original.save.call(this);
        this.globalAlpha = Math.max(.08, Math.min(.42, Number(this.globalAlpha || 1) * .34));
        this.strokeStyle = 'rgba(255,255,255,.42)';
        this.lineWidth = .42;
        original.beginPath.call(this);
        for (const [x, y] of pts) {
          original.moveTo.call(this, cx, cy);
          original.lineTo.call(this, x, y);
        }
        original.stroke.call(this);
        original.restore.call(this);
        this.__polygonStrikeFacetDrawing = false;
      }
      return result;
    };
  }

  function installLoopLabeling(root) {
    const proto = root && root.CanvasRenderingContext2D && root.CanvasRenderingContext2D.prototype;
    if (proto && !proto.__polygonStrikeV052Labels) {
      proto.__polygonStrikeV052Labels = true;
      const originalFillText = proto.fillText;
      proto.fillText = function (text, x, y, maxWidth) {
        let value = text;
        if (typeof value === 'string') {
          let m = value.match(/^STAGE (\d+)\/4$/);
          if (m) {
            const slot = Number(m[1]);
            value = `LOOP ${campaignLoop(slot)} STAGE ${baseStageNumber(slot)}/4`;
          } else {
            m = value.match(/^STAGE (\d+)\s{2}(.+)$/);
            if (m) {
              const slot = Number(m[1]);
              value = `LOOP ${campaignLoop(slot)} STAGE ${baseStageNumber(slot)}  ${m[2]}`;
            }
          }
        }
        return maxWidth === undefined ? originalFillText.call(this, value, x, y) : originalFillText.call(this, value, x, y, maxWidth);
      };
    }

    const panel = root && root.document && root.document.getElementById('startPanel');
    if (panel && root.MutationObserver && !panel.__polygonStrikeV052Observer) {
      const normalize = () => {
        panel.querySelectorAll('p').forEach(p => {
          const m = p.textContent && p.textContent.match(/^STAGE (\d+)$/);
          if (m) {
            const slot = Number(m[1]);
            p.textContent = `LOOP ${campaignLoop(slot)} / STAGE ${baseStageNumber(slot)}`;
          }
        });
      };
      const observer = new root.MutationObserver(normalize);
      observer.observe(panel, { childList: true, subtree: true });
      panel.__polygonStrikeV052Observer = observer;
    }
  }

  function install(core, root = typeof globalThis !== 'undefined' ? globalThis : {}) {
    if (!core || core.__v052EnhancementsInstalled) return core;

    const baseConfig = core.CONFIG;
    const baseStageConfig = core.stageConfig.bind(core);
    const baseMakeEnemy = core.makeEnemy.bind(core);
    const baseMakeGroundEnemy = core.makeGroundEnemy.bind(core);
    const baseMakeArmorPlate = core.makeArmorPlate.bind(core);
    const baseMakeBoss = core.makeBoss.bind(core);
    const baseMakeEnemyBullet = core.makeEnemyBullet.bind(core);
    const baseEnemyKindsForStage = core.enemyKindsForStage.bind(core);
    const baseSecretEncounter = core.secretEncounter.bind(core);
    const baseMakeSecretCharacter = core.makeSecretCharacter.bind(core);

    core.__v052EnhancementsInstalled = true;
    core.VERSION = VERSION;
    core.CONFIG = Object.freeze({
      ...baseConfig,
      stageCount: STAGES_PER_LOOP * CAMPAIGN_LOOPS,
      stagesPerLoop: STAGES_PER_LOOP,
      campaignLoops: CAMPAIGN_LOOPS,
      loop2EnemyMultiplier: LOOP2_ENEMY_MULTIPLIER,
      loop2BossHpMultiplier: LOOP2_BOSS_HP_MULTIPLIER
    });

    core.campaignLoop = campaignLoop;
    core.baseStageNumber = baseStageNumber;
    core.enemyCountMultiplier = enemyCountMultiplier;
    core.bossHpMultiplier = bossHpMultiplier;

    core.stageConfig = function (campaignStage) {
      const baseStage = baseStageNumber(campaignStage);
      const loop = campaignLoop(campaignStage);
      const stage = baseStageConfig(baseStage);
      return Object.freeze({
        ...stage,
        loop,
        campaignStage: Math.max(1, Math.floor(Number(campaignStage) || 1)),
        spawnBase: stage.spawnBase / enemyCountMultiplier(loop)
      });
    };

    core.enemyKindsForStage = campaignStage => baseEnemyKindsForStage(baseStageNumber(campaignStage));
    core.makeEnemy = (id, campaignStage = 1, rng = Math.random) => baseMakeEnemy(id, baseStageNumber(campaignStage), rng);
    core.makeGroundEnemy = (id, campaignStage = 1, rng = Math.random) => baseMakeGroundEnemy(id, baseStageNumber(campaignStage), rng);
    core.makeArmorPlate = (id, campaignStage = 1, rng = Math.random) => baseMakeArmorPlate(id, baseStageNumber(campaignStage), rng);
    core.makeEnemyBullet = (source, target, campaignStage = 1, speedScale = 1) => baseMakeEnemyBullet(source, target, baseStageNumber(campaignStage), speedScale);
    core.secretEncounter = (campaignStage, stageElapsed) => baseSecretEncounter(baseStageNumber(campaignStage), stageElapsed);
    core.makeSecretCharacter = campaignStage => {
      const secret = baseMakeSecretCharacter(baseStageNumber(campaignStage));
      return { ...secret, id:`secret-${campaignStage}`, campaignStage, loop:campaignLoop(campaignStage) };
    };

    core.makeBoss = function (campaignStage = 1) {
      const baseStage = baseStageNumber(campaignStage);
      const loop = campaignLoop(campaignStage);
      const boss = baseMakeBoss(baseStage);
      const hp = Math.ceil(boss.maxHp * bossHpMultiplier(loop));
      return { ...boss, id:`boss-${campaignStage}`, hp, maxHp:hp, campaignStage, loop };
    };

    core.continueCampaign = function (snapshot = {}) {
      const totalStages = STAGES_PER_LOOP * CAMPAIGN_LOOPS;
      const stage = Math.max(1, Math.min(totalStages, Math.floor(Number(snapshot.stage) || 1)));
      return {
        stage,
        score: Math.max(0, Math.floor(snapshot.score || 0)),
        worldScroll: Math.max(0, Number(snapshot.worldScroll) || 0),
        continueCount: Math.max(0, Math.floor(snapshot.continueCount || 0)) + 1,
        lives: baseConfig.defaultLives,
        stageElapsed: 0
      };
    };

    installCanvasPolygonDetail(root);
    installLoopLabeling(root);
    return core;
  }

  return {
    VERSION,
    STAGES_PER_LOOP,
    CAMPAIGN_LOOPS,
    LOOP2_ENEMY_MULTIPLIER,
    LOOP2_BOSS_HP_MULTIPLIER,
    campaignLoop,
    baseStageNumber,
    enemyCountMultiplier,
    bossHpMultiplier,
    install
  };
});
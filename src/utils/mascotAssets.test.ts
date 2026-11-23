import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { LearnerGender, RankStageId } from './levelProgression';
import {
  getMascotGifPath,
  getMascotPreloadPaths,
  MASCOT_EXPRESSION_ORDER,
  normalizeMascotGender,
  resolveMascotStage,
} from './mascotAssets';

const ALL_STAGES: readonly RankStageId[] = ['EGG', 'HATCH', 'CHICK', 'GROW', 'FLY'];
const ALL_GENDERS: readonly LearnerGender[] = ['cowok', 'cewek'];

test('all 60 animated mascot GIF assets (5 stages x 2 genders x 6 expressions) resolve and exist as valid GIFs on disk', () => {
  let count = 0;

  for (const stage of ALL_STAGES) {
    for (const gender of ALL_GENDERS) {
      for (const expression of MASCOT_EXPRESSION_ORDER) {
        const assetUrl = getMascotGifPath(stage, gender, expression);
        assert.ok(
          assetUrl.startsWith('/assets/mascot/') && assetUrl.endsWith('.gif'),
          `Unexpected mascot GIF URL: ${assetUrl}`,
        );

        const diskPath = path.resolve(process.cwd(), 'public', assetUrl.slice(1));
        assert.equal(
          fs.existsSync(diskPath),
          true,
          `Missing mascot GIF file on disk: ${diskPath}`,
        );

        const header = fs.readFileSync(diskPath).subarray(0, 6).toString('ascii');
        assert.ok(
          header === 'GIF89a' || header === 'GIF87a',
          `Invalid GIF header "${header}" for ${diskPath}`,
        );
        count += 1;
      }
    }
  }

  assert.equal(count, 60);
});

test('resolveMascotStage and normalizeMascotGender map levels and defaults accurately', () => {
  assert.equal(normalizeMascotGender(undefined), 'cowok');
  assert.equal(normalizeMascotGender(null), 'cowok');
  assert.equal(normalizeMascotGender('cewek'), 'cewek');
  assert.equal(normalizeMascotGender('cowok'), 'cowok');

  assert.equal(resolveMascotStage({ stageNumber: 1 }), 'EGG');
  assert.equal(resolveMascotStage({ stageNumber: 2 }), 'HATCH');
  assert.equal(resolveMascotStage({ stageNumber: 3 }), 'CHICK');
  assert.equal(resolveMascotStage({ stageNumber: 4 }), 'GROW');
  assert.equal(resolveMascotStage({ stageNumber: 5 }), 'FLY');

  assert.equal(resolveMascotStage({ level: 1 }), 'EGG');
  assert.equal(resolveMascotStage({ level: 3 }), 'HATCH');
  assert.equal(resolveMascotStage({ level: 5 }), 'CHICK');
  assert.equal(resolveMascotStage({ level: 8 }), 'GROW');
  assert.equal(resolveMascotStage({ level: 11 }), 'FLY');

  const preload = getMascotPreloadPaths('EGG', 'cowok');
  assert.equal(preload.length, 3);
  assert.ok(preload[0].endsWith('egg_idle.gif'));
  assert.ok(preload[1].endsWith('egg_tap_kaget.gif'));
  assert.ok(preload[2].endsWith('egg_happy.gif'));
});

/**
 * Úpravy obrázků žolíků po dávkách (b01–b12): každá dávka je samostatný soubor, ať se dají
 * kreslit nezávisle. Portréty (`FIGURE_PATCHES`) slučuje figures.ts, scény (`SCENE_PATCHES`) scenes.ts.
 * Klíče se mezi dávkami nesmí opakovat (hlídá tests/unit/joker-art.test.ts).
 */
import type { FigureSpec } from '../figureKit';
import type { SceneOp } from '../sceneKit';
import * as b01 from './b01';
import * as b02 from './b02';
import * as b03 from './b03';
import * as b04 from './b04';
import * as b05 from './b05';
import * as b06 from './b06';
import * as b07 from './b07';
import * as b08 from './b08';
import * as b09 from './b09';
import * as b10 from './b10';
import * as b11 from './b11';
import * as b12 from './b12';

export interface ArtBatch {
  readonly FIGURES: Readonly<Record<string, Partial<FigureSpec>>>;
  readonly SCENES: Readonly<Record<string, readonly SceneOp[]>>;
}

export const ART_BATCHES: Readonly<Record<string, ArtBatch>> = {
  b01,
  b02,
  b03,
  b04,
  b05,
  b06,
  b07,
  b08,
  b09,
  b10,
  b11,
  b12,
};

export const FIGURE_PATCHES: Readonly<Record<string, Partial<FigureSpec>>> = Object.assign(
  {},
  ...Object.values(ART_BATCHES).map((b) => b.FIGURES),
);

export const SCENE_PATCHES: Readonly<Record<string, readonly SceneOp[]>> = Object.assign(
  {},
  ...Object.values(ART_BATCHES).map((b) => b.SCENES),
);

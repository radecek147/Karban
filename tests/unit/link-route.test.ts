/**
 * Adresa spuštění hry (src/ui/linkRoute.ts): kořen hry, stránka odkazu na sestavu (kopie shellu s `<base>`),
 * parametr `?sestava=`, stránka 404 (kopie shellu na libovolné adrese) a přepsání adresy na kořen hry.
 */
import { describe, expect, it } from 'vitest';
import { linkRoute } from '../../src/ui/linkRoute';

const ROOT = 'https://hra.example/Karban/';

describe('linkRoute', () => {
  it('kořen hry bez parametru sestavy nic nemění', () => {
    for (const href of [ROOT, `${ROOT}index.html`, `${ROOT}?tutorial=off#gallery`]) {
      expect(linkRoute(href, href)).toEqual({
        presetId: null,
        notFound: false,
        viaLinkPage: false,
        cleanUrl: null,
      });
    }
  });

  it('?sestava= na kořeni: id a adresa bez parametru (ostatní parametry a kotva zůstanou)', () => {
    const href = `${ROOT}?tutorial=off&sestava=fotograf%3A#x`;
    expect(linkRoute(href, href)).toEqual({
      presetId: 'fotograf:',
      notFound: false,
      viaLinkPage: false,
      cleanUrl: `${ROOT}?tutorial=off#x`,
    });
  });

  it('stránka sestavy (<base> na kořen): id z cesty, adresa se přepíše na kořen', () => {
    expect(linkRoute(`${ROOT}sestava/nejsilnejsi/`, ROOT)).toEqual({
      presetId: 'nejsilnejsi',
      notFound: false,
      viaLinkPage: true,
      cleanUrl: ROOT,
    });
    // Parametry sociálních sítí zůstanou, `?sestava=` má přednost před cestou.
    expect(linkRoute(`${ROOT}sestava/nejsilnejsi/?fbclid=abc&sestava=fotograf`, ROOT)).toMatchObject({
      presetId: 'fotograf',
      cleanUrl: `${ROOT}?fbclid=abc`,
    });
  });

  it('relativní build (náhled, desktop): <base href="../../"> dává stejný kořen', () => {
    const base = new URL('../../', 'http://localhost:4173/sestava/fotograf/').href;
    expect(linkRoute('http://localhost:4173/sestava/fotograf/', base)).toMatchObject({
      presetId: 'fotograf',
      cleanUrl: 'http://localhost:4173/',
    });
  });

  it('404 pod sestava/: id i s diakritikou, interpunkcí, velkými písmeny, bez lomítka a s rozbitým kódováním', () => {
    expect(linkRoute(`${ROOT}sestava/Nejsiln%C4%9Bj%C5%A1%C3%AD!/`, ROOT).presetId).toBe('Nejsilnější!');
    expect(linkRoute(`${ROOT}Sestava/fotograf:/navic`, ROOT).presetId).toBe('fotograf:');
    expect(linkRoute(`${ROOT}sestava/photochad`, ROOT).presetId).toBe('photochad');
    expect(linkRoute(`${ROOT}sestava/%E0%A4%A/`, ROOT).presetId).toBe('%E0%A4%A');
  });

  it('dvojité lomítko v ručně psaném odkazu nevadí', () => {
    expect(linkRoute(`${ROOT}/sestava/nejsilnejsi/`, ROOT).presetId).toBe('nejsilnejsi');
    expect(linkRoute(`${ROOT}sestava//nejsilnejsi/`, ROOT).presetId).toBe('nejsilnejsi');
  });

  it('prázdný nebo nepoužitelný parametr: odebere se a platí id z cesty; bez použitelného id „nenalezeno“', () => {
    expect(linkRoute(`${ROOT}sestava/nejsilnejsi/?sestava=`, ROOT)).toMatchObject({
      presetId: 'nejsilnejsi',
      notFound: false,
      cleanUrl: ROOT,
    });
    expect(linkRoute(`${ROOT}?sestava=!!!`, `${ROOT}?sestava=!!!`)).toEqual({
      presetId: null,
      notFound: false,
      viaLinkPage: false,
      cleanUrl: ROOT,
    });
    expect(linkRoute(`${ROOT}sestava/!!!/`, ROOT)).toMatchObject({ presetId: null, notFound: true });
  });

  it('jiná neexistující adresa pod hrou: „nenalezeno“ a přepsání na kořen', () => {
    for (const href of [`${ROOT}neco/jineho`, `${ROOT}sestava/`, `${ROOT}favicon.ico`]) {
      expect(linkRoute(href, ROOT), href).toEqual({
        presetId: null,
        notFound: true,
        viaLinkPage: true,
        cleanUrl: ROOT,
      });
    }
  });

  it('adresa mimo kořen hry (cizí base) nic nemění', () => {
    expect(linkRoute('https://hra.example/jinde/sestava/fotograf/', ROOT)).toEqual({
      presetId: null,
      notFound: false,
      viaLinkPage: false,
      cleanUrl: null,
    });
  });
});

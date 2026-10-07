/**
 * Texty žolíků (patch 1.0.2 „Pouť a volby“): `jokers.<id>.name|desc|flavor`. `{param}` dosadí UI z `params`
 * definice (src/content/jokers/extra.ts). Flavor bez uvozovek — UI ho vysází kurzívou v „…“.
 */
import type { TextTree } from '../../cs';

export const jokersExtra = {
  fair_photographer: {
    name: 'Fotograf z pouti',
    desc: 'První skórující figura dá {xmult|x} mult při každém svém skórování, i opakovaném.',
    flavor: 'Fotka s králem za dvacku, s dámou za třicet. Kluk je zdarma, ale rozmazaný.',
  },
  recount_committee: {
    name: 'Volební komise',
    desc: 'První skórující karta skóruje ještě {retriggers}×.',
    flavor: 'Sečetli to třikrát a pokaždé jim vyšlo něco jiného. Tak to zapsali všechno.',
  },
  football_fan: {
    name: 'Fotbalový fanoušek',
    desc: 'Každá skórující figura skóruje ještě {retriggers}×.',
    flavor: 'Na hvězdy řve dvakrát. Na rozhodčího pořád.',
  },
  crown_goldsmith: {
    name: 'Zlatník',
    desc: 'Každá skórující figura dá {money|money}.',
    flavor: 'Korunky dělá jen pro krále, dámy a kluky. Ostatní ať si koupí bižuterii.',
  },
  beggar: {
    name: 'Žebrák',
    desc: 'Každá skórující karta bez figury má šanci {chance} {odds|z}, že dá {money|money}.',
    flavor: 'Na krále si netroufne, ale o korunu poprosí každou dvojku.',
  },
  building_savings: {
    name: 'Stavební spoření',
    desc: 'Strop úroku je o {money|money} vyšší.',
    flavor: 'Šest let vázanost, státní příspěvek a na konci garáž. Možná.',
  },
} satisfies TextTree;

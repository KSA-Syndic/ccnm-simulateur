import { describe, expect, it } from 'vitest';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';
import {
  buildMonthlyPeriods,
  enrichPeriodesSalaireDuMensuel,
  reporterSalairesVerses,
  resolveDateRupture,
} from '@/domain/arretees/timeline';
import { baseWizardInput as baseInput } from '../remuneration/helpers/remunerationTestHelpers';

/** Profil non-cadre classe 5, 2 ans d'ancienneté, sans accord. */
const baseWizardInput = (): WizardRemunerationInput =>
  baseInput({ classe: 5, situation: { anciennete: 2, experiencePro: 5 } });

describe('buildMonthlyPeriods', () => {
  it('commence la frise au 01/2024 si la date d’embauche est antérieure', () => {
    const periodes = buildMonthlyPeriods('2018-06-15');
    expect(periodes.length).toBeGreaterThan(0);
    expect(periodes[0]!.periodKey).toBe('2024-01');
  });
});

describe('enrichPeriodesSalaireDuMensuel', () => {
  it('met à jour salaireDu selon la grille annuelle (moteur complet, sans accord)', () => {
    const periodes = buildMonthlyPeriods('2024-01-01');
    expect(periodes.length).toBeGreaterThan(0);
    expect(periodes.every((p) => p.salaireDu === 0)).toBe(true);
    enrichPeriodesSalaireDuMensuel(periodes, {
      wizardInput: baseWizardInput(),
      dateEmbauche: '2024-01-01',
      nbMois: 12,
      smhSeul: true,
    });
    const p2024 = periodes.find((p) => p.periodKey?.startsWith('2024'));
    expect(p2024).toBeDefined();
    expect(p2024!.salaireDu).toBeGreaterThan(0);
  });

  it('sans accord : forfait jours (cadre) augmente le dû par rapport au forfait 35 h', () => {
    const periodes35h = buildMonthlyPeriods('2024-01-01');
    const periodesJours = buildMonthlyPeriods('2024-01-01');
    const input35h: WizardRemunerationInput = {
      ...baseWizardInput(),
      classe: 11,
      situation: { ...baseWizardInput().situation, forfait: '35h' },
    };
    const inputJours: WizardRemunerationInput = {
      ...baseWizardInput(),
      classe: 11,
      situation: { ...baseWizardInput().situation, forfait: 'jours' },
    };
    const duParams = { dateEmbauche: '2024-01-01', nbMois: 12, smhSeul: true };
    enrichPeriodesSalaireDuMensuel(periodes35h, { ...duParams, wizardInput: input35h });
    enrichPeriodesSalaireDuMensuel(periodesJours, { ...duParams, wizardInput: inputJours });
    const j35 = periodes35h.find((p) => p.periodKey === '2024-06');
    const jj = periodesJours.find((p) => p.periodKey === '2024-06');
    expect(j35).toBeDefined();
    expect(jj).toBeDefined();
    expect(jj!.salaireDu).toBeGreaterThan(j35!.salaireDu);
  });
});

describe('rupture du contrat', () => {
  it('arrête la frise au mois de rupture', () => {
    const periodes = buildMonthlyPeriods('2024-01-01', '2024-06-14');
    expect(periodes.map((p) => p.periodKey)).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
      '2024-06',
    ]);
  });

  it('ignore une rupture antérieure à l’embauche', () => {
    expect(resolveDateRupture('2024-03-01', '2024-02-01')).toBeNull();
    expect(resolveDateRupture('2024-03-01', '')).toBeNull();
    expect(resolveDateRupture('2024-03-01', '2024-03-01')).toBe('2024-03-01');
    expect(buildMonthlyPeriods('2024-03-01', '2024-02-01').length).toBe(
      buildMonthlyPeriods('2024-03-01').length,
    );
  });

  it('proratise le mois de rupture aux jours ouvrés travaillés', () => {
    const avecRupture = buildMonthlyPeriods('2024-01-01', '2024-06-14');
    const sansRupture = buildMonthlyPeriods('2024-01-01');
    const params = {
      wizardInput: baseWizardInput(),
      dateEmbauche: '2024-01-01',
      nbMois: 12,
      smhSeul: true,
    };
    enrichPeriodesSalaireDuMensuel(avecRupture, { ...params, dateRupture: '2024-06-14' });
    enrichPeriodesSalaireDuMensuel(sansRupture, params);
    const juinRupture = avecRupture.find((p) => p.periodKey === '2024-06')!;
    const juinPlein = sansRupture.find((p) => p.periodKey === '2024-06')!;
    const maiRupture = avecRupture.find((p) => p.periodKey === '2024-05')!;
    const maiPlein = sansRupture.find((p) => p.periodKey === '2024-05')!;
    expect(juinRupture.salaireDu).toBeLessThan(juinPlein.salaireDu);
    expect(juinRupture.salaireDu).toBeGreaterThan(0);
    expect(maiRupture.salaireDu).toBe(maiPlein.salaireDu);
  });
});

describe('changement de classification', () => {
  const params = () => ({
    wizardInput: { ...baseWizardInput(), classe: 7, groupe: 'D' },
    dateEmbauche: '2024-01-01',
    nbMois: 12,
    smhSeul: true,
  });
  const duDe = (periodes: ReturnType<typeof buildMonthlyPeriods>, key: string) =>
    periodes.find((p) => p.periodKey === key)!.salaireDu;

  it('calcule les mois antérieurs sur la classe d’avant, les suivants sur la classe actuelle', () => {
    const avec = buildMonthlyPeriods('2024-01-01');
    const sans = buildMonthlyPeriods('2024-01-01');
    const ancienne = buildMonthlyPeriods('2024-01-01');
    enrichPeriodesSalaireDuMensuel(avec, {
      ...params(),
      changementClassification: { date: '2024-07-01', groupe: 'B', classe: 3 },
    });
    enrichPeriodesSalaireDuMensuel(sans, params());
    enrichPeriodesSalaireDuMensuel(ancienne, {
      ...params(),
      wizardInput: { ...baseWizardInput(), classe: 3, groupe: 'B' },
    });
    expect(duDe(avec, '2024-06')).toBe(duDe(ancienne, '2024-06'));
    expect(duDe(avec, '2024-06')).toBeLessThan(duDe(sans, '2024-06'));
    expect(duDe(avec, '2024-07')).toBe(duDe(sans, '2024-07'));
    expect(duDe(avec, '2024-08')).toBe(duDe(sans, '2024-08'));
  });

  it('proratise le mois du changement entre les deux classifications', () => {
    const avec = buildMonthlyPeriods('2024-01-01');
    const sans = buildMonthlyPeriods('2024-01-01');
    const ancienne = buildMonthlyPeriods('2024-01-01');
    enrichPeriodesSalaireDuMensuel(avec, {
      ...params(),
      changementClassification: { date: '2024-07-15', groupe: 'B', classe: 3 },
    });
    enrichPeriodesSalaireDuMensuel(sans, params());
    enrichPeriodesSalaireDuMensuel(ancienne, {
      ...params(),
      wizardInput: { ...baseWizardInput(), classe: 3, groupe: 'B' },
    });
    expect(duDe(avec, '2024-07')).toBeGreaterThan(duDe(ancienne, '2024-07'));
    expect(duDe(avec, '2024-07')).toBeLessThan(duDe(sans, '2024-07'));
  });
});

describe('reporterSalairesVerses', () => {
  it('conserve les salaires saisis des mois communs', () => {
    const anciennes = buildMonthlyPeriods('2024-01-01').slice(0, 3);
    anciennes[1]!.salaireVerse = 2100;
    const nouvelles = buildMonthlyPeriods('2024-01-01').slice(0, 3);
    const out = reporterSalairesVerses(nouvelles, anciennes);
    expect(out.map((p) => p.salaireVerse)).toEqual([undefined, 2100, undefined]);
  });
});

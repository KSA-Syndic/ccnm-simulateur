import { CONFIG } from '../config';
import { SEMANTIC_ID, type ElementDef } from '../types';
import type { Agreement } from './interface';

const HS_SEUIL = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES;

/**
 * Majorations d’entreprise substituables aux lignes CCN homonymes (`favorPrinciple`).
 */
export function getAccordMajorationDefsForRemuneration(agreement: Agreement): ElementDef[] {
  const out: ElementDef[] = [];
  const m = agreement.majorations;
  if (!m) return out;

  if (m.nuit) {
    const taux = m.nuit.posteNuit;
    out.push({
      id: 'majorationNuit',
      semanticId: SEMANTIC_ID.MAJORATION_NUIT,
      kind: 'majoration',
      source: 'accord',
      valueKind: 'pourcentage',
      label: `Majoration nuit ${agreement.nomCourt}`,
      substitution: { semanticId: SEMANTIC_ID.MAJORATION_NUIT, strategy: 'favorPrinciple' },
      activation: {
        type: 'custom',
        check: (ctx) =>
          String(ctx.state['typeNuit'] ?? 'aucun') !== 'aucun' &&
          Number(ctx.state['heuresNuit'] ?? 0) > 0,
      },
      computeMode: {
        mode: 'heuresXtaux',
        heures: { ref: 'state', key: 'heuresNuit' },
        taux: { ref: 'constant', value: taux },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
        majorationSeule: true,
      },
    });
  }

  if (m.dimanche != null) {
    out.push({
      id: 'majorationDimanche',
      semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
      kind: 'majoration',
      source: 'accord',
      valueKind: 'pourcentage',
      label: `Majoration dimanche ${agreement.nomCourt}`,
      substitution: { semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE, strategy: 'favorPrinciple' },
      activation: {
        type: 'custom',
        check: (ctx) =>
          ctx.state['travailDimanche'] === true && Number(ctx.state['heuresDimanche'] ?? 0) > 0,
      },
      computeMode: {
        mode: 'heuresXtaux',
        heures: { ref: 'state', key: 'heuresDimanche' },
        taux: { ref: 'constant', value: m.dimanche },
        base: { ref: 'context', key: 'tauxHoraire' },
        period: 'monthly',
        majorationSeule: true,
      },
    });
  }

  const hs = m.heuresSupplementaires;
  if (hs) {
    const t25 = hs.majoration25 ?? CONFIG.MAJORATIONS_CCN.heuresSup25;
    const t50 = hs.majoration50 ?? CONFIG.MAJORATIONS_CCN.heuresSup50;
    out.push({
      id: 'majorationHeuresSup25',
      semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
      kind: 'majoration',
      source: 'accord',
      valueKind: 'pourcentage',
      label: `Majoration heures supplémentaires (+25%) ${agreement.nomCourt}`,
      substitution: {
        semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
        strategy: 'favorPrinciple',
      },
      stateKeyActif: 'travailHeuresSup',
      stateKeyHeures: 'heuresSup',
      config: { seuilMensuel: HS_SEUIL },
      computeMode: {
        mode: 'heuresXtaux',
        heures: {
          ref: 'heuresSupTranche',
          stateKeyHeures: 'heuresSup',
          seuilMensuel: HS_SEUIL,
          tranche: '25',
        },
        taux: { ref: 'constant', value: t25 },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
        majorationSeule: true,
      },
    });
    out.push({
      id: 'majorationHeuresSup50',
      semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
      kind: 'majoration',
      source: 'accord',
      valueKind: 'pourcentage',
      label: `Majoration heures supplémentaires (+50%) ${agreement.nomCourt}`,
      substitution: {
        semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
        strategy: 'favorPrinciple',
      },
      stateKeyActif: 'travailHeuresSup',
      stateKeyHeures: 'heuresSup',
      config: { seuilMensuel: HS_SEUIL },
      computeMode: {
        mode: 'heuresXtaux',
        heures: {
          ref: 'heuresSupTranche',
          stateKeyHeures: 'heuresSup',
          seuilMensuel: HS_SEUIL,
          tranche: '50',
        },
        taux: { ref: 'constant', value: t50 },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
        majorationSeule: true,
      },
    });
  }

  return out;
}

import type { ClaimCard, PartyAggregatedProfile, PartyAffiliation, PositionStatus } from '../types';
import { lockedDimensions } from '../data/mockClaims';

export function calculateClaimWeight(claim: ClaimCard): number {
  // 1. Policygrad faktor
  let policyFactor = 0;
  if (claim.policyDegree === 0) policyFactor = 0;
  else if (claim.policyDegree === 1) policyFactor = 0.25;
  else if (claim.policyDegree === 2) policyFactor = 0.75;
  else if (claim.policyDegree === 3) policyFactor = 1.0;

  // 2. Partibäring faktor
  let bearingFactor = 0;
  if (claim.partyBearing === 'Låg') bearingFactor = 0.4;
  else if (claim.partyBearing === 'Medel') bearingFactor = 0.7;
  else if (claim.partyBearing === 'Hög') bearingFactor = 1.0;

  // 3. Granskningsstatus faktor
  let reviewFactor = 0.5;
  if (claim.reviewStatus === 'Granskad') reviewFactor = 0.8;
  else if (['Kalibrerad', 'Låst', 'Arkiverad'].includes(claim.reviewStatus)) reviewFactor = 1.0;

  // 4. Evidensfaktor (evidensstyrka 0-5 blir 0.0 till 1.0)
  const evidenceFactor = claim.evidenceStrength * 0.2;

  // Formel: totalvikt = policygrad_faktor * källvikt * partibäring_faktor * evidens_faktor * gransknings_faktor
  const weight = policyFactor * claim.sourceWeight * bearingFactor * evidenceFactor * reviewFactor;
  
  return parseFloat(weight.toFixed(3));
}

export function isPolicyClaim(claim: ClaimCard): boolean {
  // Spår A: AI-policyclaims (får påverka partipoäng)
  // Ej AI-nära enbart, ej kampanjpraktik enbart, ej enbart externt tryck
  return !claim.nearAiFlag && !claim.campaignPracticeFlag && !claim.externalPressureFlag && claim.partyAffiliation !== 'Externt';
}

export function evaluatePartyStanceStatus(
  claims: ClaimCard[],
  totalWeight: number
): PositionStatus {
  const count = claims.length;

  if (count < 2 || totalWeight < 0.5) {
    return 'Ingen bedömning';
  }

  // Check bearing types
  const hasHighBearing = claims.some(c => c.partyBearing === 'Hög');
  const hasHighSourceWeight = claims.some(c => c.sourceWeight >= 4);

  // official sources
  const officialSourceTypes = ['Regeringsbeslut', 'Strategi', 'Budget', 'Motion'];
  const hasOfficialSource = claims.some(c => officialSourceTypes.includes(c.sourceType));
  
  // High concretion
  const hasHighConcretion = claims.some(c => c.concretionDegree >= 3);

  // Check if we satisfy Strong Position
  if (count >= 5 && hasHighBearing && hasOfficialSource && hasHighConcretion && claims.filter(c => c.policyDegree === 3).length >= 2) {
    return 'Stark position';
  }

  // Check if we satisfy Fast Position
  if (count >= 3 && hasOfficialSource && (hasHighBearing || hasHighSourceWeight)) {
    // Check if spread over different dates/periods
    const dates = new Set(claims.map(c => c.date));
    if (dates.size >= 2) {
      return 'Fast position';
    }
  }

  // Check if Preliminär Position
  if (count >= 3 && (hasHighSourceWeight || hasHighBearing)) {
    return 'Preliminär position';
  }

  // Indikation
  if (count >= 2) {
    return 'Indikation';
  }

  return 'Ingen bedömning';
}

export function aggregatePartyProfiles(allClaims: ClaimCard[]): PartyAggregatedProfile[] {
  const parties: PartyAffiliation[] = ['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'];
  
  // Filter claims belonging to Spår A (AI-policy)
  const policyClaims = allClaims.filter(isPolicyClaim);

  return parties.map(party => {
    const partyClaims = policyClaims.filter(c => c.partyAffiliation === party);
    const claimCount = partyClaims.length;

    let totalWeight = 0;
    let weightedAccel = 0;
    let weightedProt = 0;
    let weightedGov = 0;

    // Dimension aggregation
    const dimensionScores: Record<number, number> = {};
    const dimensionClaimsCount: Record<number, number> = {};
    const dimensionWeightSums: Record<number, number> = {};
    const dimensionWeightedConcretion: Record<number, number> = {};

    lockedDimensions.forEach(d => {
      dimensionScores[d.id] = 0;
      dimensionClaimsCount[d.id] = 0;
      dimensionWeightSums[d.id] = 0;
      dimensionWeightedConcretion[d.id] = 0;
    });

    partyClaims.forEach(claim => {
      const weight = calculateClaimWeight(claim);
      totalWeight += weight;

      weightedAccel += claim.accelerationContribution * weight;
      weightedProt += claim.protectionContribution * weight;
      weightedGov += claim.stateGovernanceContribution * weight;

      // Handle dimensions (primary + secondary)
      const dims = [claim.primaryDimension, ...claim.secondaryDimensions].filter(id => id >= 1 && id <= 12);
      // Remove duplicates
      const uniqueDims = Array.from(new Set(dims));

      uniqueDims.forEach(dimId => {
        dimensionClaimsCount[dimId] += 1;
        dimensionWeightSums[dimId] += weight;
        // Concretion degree (0-4) is mapped as the base score
        dimensionWeightedConcretion[dimId] += claim.concretionDegree * weight;
      });
    });

    // Calculate overall indexes (0-5 scale)
    const accelerationScore = totalWeight > 0 ? parseFloat((weightedAccel / totalWeight).toFixed(2)) : 0;
    const protectionScore = totalWeight > 0 ? parseFloat((weightedProt / totalWeight).toFixed(2)) : 0;
    const governanceScore = totalWeight > 0 ? parseFloat((weightedGov / totalWeight).toFixed(2)) : 0;

    // Calculate dimension scores (scale to 0-5: concretion (0-4) * 1.25 = 0-5)
    lockedDimensions.forEach(d => {
      const wSum = dimensionWeightSums[d.id];
      if (wSum > 0) {
        const avgConcretion = dimensionWeightedConcretion[d.id] / wSum;
        dimensionScores[d.id] = parseFloat((avgConcretion * 1.25).toFixed(2));
      } else {
        dimensionScores[d.id] = 0;
      }
    });

    const status = evaluatePartyStanceStatus(partyClaims, totalWeight);

    return {
      party,
      status,
      claimCount,
      weightedScoreCount: parseFloat(totalWeight.toFixed(2)),
      accelerationScore,
      protectionScore,
      governanceScore,
      dimensionScores,
      dimensionClaimsCount
    };
  });
}

// ----------------------------------------------------
// AGENDA PRESSURE & GAP ANALYSIS
// ----------------------------------------------------

export interface GapAnalysisItem {
  dimensionId: number;
  dimensionName: string;
  agendaPressure: number; // 0-5
  partyResponse: number; // 0-5
  conclusion: string;
  expertClaimCount: number;
}

export function calculateAgendaPressure(dimensionId: number, allClaims: ClaimCard[]): { score: number; count: number } {
  // Aggregate external claims in this dimension
  const externalClaims = allClaims.filter(c => c.partyAffiliation === 'Externt' && 
    (c.primaryDimension === dimensionId || c.secondaryDimensions.includes(dimensionId))
  );

  const count = externalClaims.length;
  if (count === 0) return { score: 0, count: 0 };

  // Calculate dynamic agenda pressure based on count and actor types
  let baseScore: number;
  
  // Weight by actor type severity
  let hasHeavyActor = false;
  let hasMediumActor = false;
  
  externalClaims.forEach(c => {
    if (['Intresseorganisation', 'Myndighet', 'Riksdagsutskott'].includes(c.actorType)) {
      hasHeavyActor = true;
    } else if (c.actorType === 'Expert/forskare') {
      hasMediumActor = true;
    }
  });

  // Calibrated for a database of ~350 claims (up from original 15 mock claims)
  if (count === 1) {
    baseScore = hasHeavyActor ? 1.5 : (hasMediumActor ? 1.2 : 1.0);
  } else if (count === 2) {
    baseScore = hasHeavyActor ? 2.2 : 2.0;
  } else if (count <= 4) {
    baseScore = hasHeavyActor ? 2.8 : 2.5;
  } else if (count <= 7) {
    baseScore = hasHeavyActor ? 3.8 : 3.5;
  } else if (count <= 12) {
    baseScore = hasHeavyActor ? 4.8 : 4.5;
  } else {
    baseScore = 5.0;
  }

  // Scale to 0-5
  const score = Math.min(5, baseScore);
  return { score: parseFloat(score.toFixed(1)), count };
}

export function performGapAnalysis(allClaims: ClaimCard[]): GapAnalysisItem[] {
  const partyProfiles = aggregatePartyProfiles(allClaims);

  return lockedDimensions.map(d => {
    // 1. Agendatryck (0-5)
    const { score: agendaPressure, count: expertClaimCount } = calculateAgendaPressure(d.id, allClaims);

    // 2. Partirespons (0-5)
    let totalPartyClaimsInDim = 0;
    partyProfiles.forEach(p => {
      totalPartyClaimsInDim += p.dimensionClaimsCount[d.id] || 0;
    });

    // Calibrated for a database of ~350 claims (up from original 15 mock claims)
    let partyResponse: number;
    if (totalPartyClaimsInDim === 0) partyResponse = 0;
    else if (totalPartyClaimsInDim <= 2) partyResponse = 1.0;
    else if (totalPartyClaimsInDim <= 5) partyResponse = 2.0;
    else if (totalPartyClaimsInDim <= 10) partyResponse = 3.0;
    else if (totalPartyClaimsInDim <= 18) partyResponse = 4.0;
    else if (totalPartyClaimsInDim <= 27) partyResponse = 4.5;
    else partyResponse = 5.0;

    // 3. Slutsats (Gap-analys regler, justerade för kalibrerade skalor)
    let conclusion = 'Balanserad bevakning';
    if (agendaPressure >= 3.5 && partyResponse < 2.5) {
      conclusion = 'Tyst valfråga med möjlig sprängkraft';
    } else if (agendaPressure >= 3 && partyResponse >= 3) {
      conclusion = 'Etablerad politisk fråga';
    } else if (agendaPressure < 2.5 && partyResponse < 2.5) {
      conclusion = 'Blind fläck';
    } else if (agendaPressure >= 2.5 && partyResponse < 3.5) {
      conclusion = 'Underutvecklad partipolitik';
    } else if (agendaPressure < 3.0 && partyResponse >= 3.0) {
      conclusion = 'Överrepresenterad partidebatt';
    }

    return {
      dimensionId: d.id,
      dimensionName: d.name,
      agendaPressure,
      partyResponse,
      conclusion,
      expertClaimCount
    };
  });
}

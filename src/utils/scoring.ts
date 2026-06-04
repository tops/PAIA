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

  // 5. Tidsavtrappning (Recency factor) - 15% decay per year, min 0.3
  const claimYear = parseInt(claim.date.substring(0, 4)) || 2026;
  const age = Math.max(0, 2026 - claimYear);
  const recencyFactor = Math.max(0.3, 1 - age * 0.15);

  // Formel: totalvikt = policygrad_faktor * källvikt * partibäring_faktor * evidens_faktor * gransknings_faktor * recency_faktor
  const weight = policyFactor * claim.sourceWeight * bearingFactor * evidenceFactor * reviewFactor * recencyFactor;
  
  return parseFloat(weight.toFixed(3));
}

export function calculateClaimWeightsMap(claims: ClaimCard[]): Map<string, number> {
  const weightsMap = new Map<string, number>();
  
  // 1. Calculate base weights first
  const baseWeights: Record<string, number> = {};
  claims.forEach(c => {
    baseWeights[c.id] = calculateClaimWeight(c);
  });

  // 2. Group claims by party and dimension to find overlaps (within 30 days and sharing tags)
  const groups: ClaimCard[][] = [];

  claims.forEach(claim => {
    let joinedGroup = false;
    for (const group of groups) {
      const representative = group[0];
      
      const sameParty = claim.partyAffiliation === representative.partyAffiliation;
      const sameDim = claim.primaryDimension === representative.primaryDimension;
      
      if (sameParty && sameDim) {
        const dateA = new Date(claim.date);
        const dateB = new Date(representative.date);
        const diffDays = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 30) {
          const sharedTags = claim.tags.filter(t => representative.tags.includes(t)).length;
          const hasTagOverlap = sharedTags >= 2 || 
            (claim.tags.length === 1 && representative.tags.length === 1 && claim.tags[0] === representative.tags[0]) ||
            (claim.tags.length === 0 && representative.tags.length === 0);
            
          if (hasTagOverlap) {
            group.push(claim);
            joinedGroup = true;
            break;
          }
        }
      }
    }

    if (!joinedGroup) {
      groups.push([claim]);
    }
  });

  // 3. Assign final weights - heaviest in group gets full base weight, others get 25% (0.25)
  groups.forEach(group => {
    if (group.length === 1) {
      const c = group[0];
      weightsMap.set(c.id, baseWeights[c.id]);
    } else {
      let heaviest = group[0];
      let maxWeight = baseWeights[heaviest.id];
      
      for (let i = 1; i < group.length; i++) {
        const w = baseWeights[group[i].id];
        if (w > maxWeight) {
          maxWeight = w;
          heaviest = group[i];
        }
      }

      group.forEach(c => {
        if (c.id === heaviest.id) {
          weightsMap.set(c.id, baseWeights[c.id]);
        } else {
          weightsMap.set(c.id, parseFloat((baseWeights[c.id] * 0.25).toFixed(3)));
        }
      });
    }
  });

  return weightsMap;
}

export function isPolicyClaim(claim: ClaimCard): boolean {
  // Spår A: AI-policyclaims (får påverka partipoäng)
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

  // Tightened Strong Position criteria: At least 50% must be official high-bearing/heavy-source claims
  const officialClaimsCount = claims.filter(c => c.partyBearing === 'Hög' || c.sourceWeight >= 4).length;
  const officialRatio = officialClaimsCount / count;

  // Check if we satisfy Strong Position
  if (count >= 5 && hasHighBearing && hasOfficialSource && hasHighConcretion && 
      claims.filter(c => c.policyDegree === 3).length >= 2 && officialRatio >= 0.5) {
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

export function detectStanceShifts(
  partyClaims: ClaimCard[],
  weightsMap: Map<string, number>
): Array<{ axis: 'Acceleration' | 'Protection' | 'Governance'; amount: number; oldScore: number; newScore: number }> {
  const shifts: Array<{ axis: 'Acceleration' | 'Protection' | 'Governance'; amount: number; oldScore: number; newScore: number }> = [];
  
  const oldClaims = partyClaims.filter(c => {
    const yr = parseInt(c.date.substring(0, 4)) || 2026;
    return yr < 2024;
  });
  const newClaims = partyClaims.filter(c => {
    const yr = parseInt(c.date.substring(0, 4)) || 2026;
    return yr >= 2024;
  });
  
  if (oldClaims.length === 0 || newClaims.length === 0) return shifts;
  
  let oldWeight = 0;
  let oldAcc = 0, oldProt = 0, oldGov = 0;
  oldClaims.forEach(c => {
    const w = weightsMap.get(c.id) || 0;
    oldWeight += w;
    oldAcc += c.accelerationContribution * w;
    oldProt += c.protectionContribution * w;
    oldGov += c.stateGovernanceContribution * w;
  });
  
  let newWeight = 0;
  let newAcc = 0, newProt = 0, newGov = 0;
  newClaims.forEach(c => {
    const w = weightsMap.get(c.id) || 0;
    newWeight += w;
    newAcc += c.accelerationContribution * w;
    newProt += c.protectionContribution * w;
    newGov += c.stateGovernanceContribution * w;
  });
  
  if (oldWeight > 0 && newWeight > 0) {
    const axes: Array<{ name: 'Acceleration' | 'Protection' | 'Governance'; oldVal: number; newVal: number }> = [
      { name: 'Acceleration', oldVal: oldAcc / oldWeight, newVal: newAcc / newWeight },
      { name: 'Protection', oldVal: oldProt / oldWeight, newVal: newProt / newWeight },
      { name: 'Governance', oldVal: oldGov / oldWeight, newVal: newGov / newWeight }
    ];
    
    axes.forEach(a => {
      const diff = a.newVal - a.oldVal;
      if (Math.abs(diff) >= 1.0) {
        shifts.push({
          axis: a.name,
          amount: parseFloat(diff.toFixed(2)),
          oldScore: parseFloat(a.oldVal.toFixed(2)),
          newScore: parseFloat(a.newVal.toFixed(2))
        });
      }
    });
  }
  
  return shifts;
}

export function aggregatePartyProfiles(allClaims: ClaimCard[]): PartyAggregatedProfile[] {
  const parties: PartyAffiliation[] = ['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'];
  
  // Calculate weights mapping for deduplication and aging
  const weightsMap = calculateClaimWeightsMap(allClaims);

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
    const dimensionWeightedAccel: Record<number, number> = {};
    const dimensionWeightedProt: Record<number, number> = {};
    const dimensionWeightedGov: Record<number, number> = {};

    lockedDimensions.forEach(d => {
      dimensionScores[d.id] = 0;
      dimensionClaimsCount[d.id] = 0;
      dimensionWeightSums[d.id] = 0;
      dimensionWeightedConcretion[d.id] = 0;
      dimensionWeightedAccel[d.id] = 0;
      dimensionWeightedProt[d.id] = 0;
      dimensionWeightedGov[d.id] = 0;
    });

    partyClaims.forEach(claim => {
      const weight = weightsMap.get(claim.id) || 0;
      totalWeight += weight;

      weightedAccel += claim.accelerationContribution * weight;
      weightedProt += claim.protectionContribution * weight;
      weightedGov += claim.stateGovernanceContribution * weight;

      // Handle dimensions (primary + secondary)
      const dims = [claim.primaryDimension, ...claim.secondaryDimensions].filter(id => id >= 1 && id <= 12);
      const uniqueDims = Array.from(new Set(dims));

      uniqueDims.forEach(dimId => {
        dimensionClaimsCount[dimId] += 1;
        dimensionWeightSums[dimId] += weight;
        dimensionWeightedConcretion[dimId] += claim.concretionDegree * weight;
        dimensionWeightedAccel[dimId] += claim.accelerationContribution * weight;
        dimensionWeightedProt[dimId] += claim.protectionContribution * weight;
        dimensionWeightedGov[dimId] += claim.stateGovernanceContribution * weight;
      });
    });

    // Calculate overall indexes (0-5 scale)
    const accelerationScore = totalWeight > 0 ? parseFloat((weightedAccel / totalWeight).toFixed(2)) : 0;
    const protectionScore = totalWeight > 0 ? parseFloat((weightedProt / totalWeight).toFixed(2)) : 0;
    const governanceScore = totalWeight > 0 ? parseFloat((weightedGov / totalWeight).toFixed(2)) : 0;

    // Calculate dimension scores (scale to 0-5) & dimension stance scores
    const dimensionStanceScores: Record<number, { acceleration: number; protection: number; governance: number }> = {};
    
    lockedDimensions.forEach(d => {
      const wSum = dimensionWeightSums[d.id];
      if (wSum > 0) {
        const avgConcretion = dimensionWeightedConcretion[d.id] / wSum;
        dimensionScores[d.id] = parseFloat((avgConcretion * 1.25).toFixed(2));
        dimensionStanceScores[d.id] = {
          acceleration: parseFloat((dimensionWeightedAccel[d.id] / wSum).toFixed(2)),
          protection: parseFloat((dimensionWeightedProt[d.id] / wSum).toFixed(2)),
          governance: parseFloat((dimensionWeightedGov[d.id] / wSum).toFixed(2))
        };
      } else {
        dimensionScores[d.id] = 0;
        dimensionStanceScores[d.id] = { acceleration: 0, protection: 0, governance: 0 };
      }
    });

    const status = evaluatePartyStanceStatus(partyClaims, totalWeight);
    const stanceShifts = detectStanceShifts(partyClaims, weightsMap);

    return {
      party,
      status,
      claimCount,
      weightedScoreCount: parseFloat(totalWeight.toFixed(2)),
      accelerationScore,
      protectionScore,
      governanceScore,
      dimensionScores,
      dimensionClaimsCount,
      dimensionStanceScores,
      stanceShifts
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
  maxExpertCount: number;
  rawPartyWeight: number;
  maxPartyWeight: number;
}

export function calculateAgendaPressure(dimensionId: number, allClaims: ClaimCard[]): { score: number; count: number } {
  // Aggregate external claims in this dimension, excluding parliamentary committees (Riksdagsutskott)
  // as they consist of politicians and represent legislative consensus rather than external pressure.
  const externalClaims = allClaims.filter(c => c.partyAffiliation === 'Externt' && 
    c.actorType !== 'Riksdagsutskott' &&
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
    // Broadened heavy actors to include Unions (Fackförbund) and Civil Society (Civilsamhälle)
    if (['Intresseorganisation', 'Myndighet', 'Fackförbund', 'Civilsamhälle'].includes(c.actorType)) {
      hasHeavyActor = true;
    } else if (c.actorType === 'Expert/forskare') {
      hasMediumActor = true;
    }
  });

  // Calibrated for a database of ~350 claims
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
  const weightsMap = calculateClaimWeightsMap(allClaims);
  const policyClaims = allClaims.filter(isPolicyClaim);

  // Calculate raw party weights and expert counts per dimension
  const rawPartyWeights: Record<number, number> = {};
  const expertCounts: Record<number, number> = {};

  lockedDimensions.forEach(d => {
    rawPartyWeights[d.id] = 0;
    const { count } = calculateAgendaPressure(d.id, allClaims);
    expertCounts[d.id] = count;
  });

  policyClaims.forEach(c => {
    const weight = weightsMap.get(c.id) || 0;
    const dims = [c.primaryDimension, ...c.secondaryDimensions].filter(id => id >= 1 && id <= 12);
    const uniqueDims = Array.from(new Set(dims));
    uniqueDims.forEach(dimId => {
      rawPartyWeights[dimId] += weight;
    });
  });

  const maxPartyWeight = Math.max(...Object.values(rawPartyWeights), 1);
  const maxExpertCount = Math.max(...Object.values(expertCounts), 1);

  return lockedDimensions.map(d => {
    const expertClaimCount = expertCounts[d.id];
    
    // Normalize both metrics on a 0-5 scale
    // We use SQRT scaling for party response to handle outlier dimensions
    // We use Linear scaling for agenda pressure since counts are small integers (0-4)
    const agendaPressure = parseFloat(((expertCounts[d.id] / maxExpertCount) * 5).toFixed(1));
    const partyResponse = parseFloat((Math.sqrt(rawPartyWeights[d.id] / maxPartyWeight) * 5).toFixed(1));

    // Recalibrated Gap diagnosis rules adjusted for hybrid scale
    let conclusion = 'Balanserad bevakning';
    if (agendaPressure >= 3.0 && partyResponse < 2.0) {
      conclusion = 'Tyst valfråga med möjlig sprängkraft';
    } else if (agendaPressure >= 2.5 && partyResponse >= 2.5) {
      conclusion = 'Etablerad politisk fråga';
    } else if (agendaPressure < 1.5 && partyResponse < 1.5) {
      conclusion = 'Blind fläck';
    } else if (agendaPressure >= 2.0 && partyResponse < 2.5) {
      conclusion = 'Underutvecklad partipolitik';
    } else if (agendaPressure < 2.0 && partyResponse >= 3.0) {
      conclusion = 'Överrepresenterad partidebatt';
    }

    return {
      dimensionId: d.id,
      dimensionName: d.name,
      agendaPressure,
      partyResponse,
      conclusion,
      expertClaimCount,
      maxExpertCount,
      rawPartyWeight: parseFloat(rawPartyWeights[d.id].toFixed(2)),
      maxPartyWeight: parseFloat(maxPartyWeight.toFixed(2))
    };
  });
}

// ----------------------------------------------------
// IDEOLOGICAL OPPOSITES (MOTPOLER) PER DIMENSION
// ----------------------------------------------------

export interface DimensionOpposite {
  partyA: PartyAffiliation;
  partyB: PartyAffiliation;
  axis: 'Acceleration' | 'Protection' | 'Governance';
  scoreA: number;
  scoreB: number;
  diff: number;
}

export function calculateDimensionOpposites(
  claims: ClaimCard[]
): Record<number, DimensionOpposite | null> {
  const profiles = aggregatePartyProfiles(claims);
  const result: Record<number, DimensionOpposite | null> = {};

  lockedDimensions.forEach(d => {
    let maxDiff = -1;
    let bestOpposite: DimensionOpposite | null = null;

    // Only compare parties with claims in this dimension
    const activeProfiles = profiles.filter(p => (p.dimensionClaimsCount[d.id] || 0) > 0);

    if (activeProfiles.length >= 2) {
      for (let i = 0; i < activeProfiles.length; i++) {
        for (let j = i + 1; j < activeProfiles.length; j++) {
          const pA = activeProfiles[i];
          const pB = activeProfiles[j];

          const stanceA = pA.dimensionStanceScores?.[d.id];
          const stanceB = pB.dimensionStanceScores?.[d.id];

          if (stanceA && stanceB) {
            // Find the axis with the largest difference
            const axes: Array<{ name: 'Acceleration' | 'Protection' | 'Governance'; valA: number; valB: number }> = [
              { name: 'Acceleration', valA: stanceA.acceleration, valB: stanceB.acceleration },
              { name: 'Protection', valA: stanceA.protection, valB: stanceB.protection },
              { name: 'Governance', valA: stanceA.governance, valB: stanceB.governance }
            ];

            axes.forEach(axis => {
              const diff = Math.abs(axis.valA - axis.valB);
              if (diff > maxDiff) {
                maxDiff = diff;
                bestOpposite = {
                  partyA: pA.party,
                  partyB: pB.party,
                  axis: axis.name,
                  scoreA: axis.valA,
                  scoreB: axis.valB,
                  diff: parseFloat(diff.toFixed(2))
                };
              }
            });
          }
        }
      }
    }

    // A difference of at least 0.5 points is required to be considered a meaningful ideological contrast
    result[d.id] = maxDiff >= 0.5 ? bestOpposite : null;
  });

  return result;
}

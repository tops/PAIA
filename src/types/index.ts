export type ActorType =
  | 'Parti'
  | 'Regering'
  | 'Minister'
  | 'Riksdagsgrupp'
  | 'Enskild riksdagsledamot'
  | 'EU-parlamentariker'
  | 'Partisekreterare/kampanjorganisation'
  | 'Myndighet'
  | 'Intresseorganisation'
  | 'Expert/forskare'
  | 'Civilsamhälle'
  | 'Fackförbund'
  | 'Riksdagsutskott';

export type PartyAffiliation =
  | 'S'
  | 'M'
  | 'SD'
  | 'C'
  | 'V'
  | 'MP'
  | 'L'
  | 'KD'
  | 'Externt';

export type ClaimType =
  | 'Problem'
  | 'Mål'
  | 'Åtgärd'
  | 'Risk'
  | 'Värdering'
  | 'Ansvar';

export type SourceType =
  | 'Budget'
  | 'Strategi'
  | 'Motion'
  | 'Intervju'
  | 'Tweet'
  | 'Debattartikel'
  | 'Regeringsbeslut'
  | 'Pressmeddelande';

export type AssessmentConfidence = 'Låg' | 'Medel' | 'Hög';

export type ReviewStatus = 'Ny' | 'Granskad' | 'Kalibrerad' | 'Låst' | 'Arkiverad';

export interface ClaimCard {
  id: string;
  date: string; // YYYY-MM-DD
  source: string;
  sourceType: SourceType;
  sourceWeight: number; // 1-5
  actor: string;
  actorType: ActorType;
  partyAffiliation: PartyAffiliation;
  partyBearing: 'Låg' | 'Medel' | 'Hög';
  originalQuote: string;
  neutralSummary: string;
  claimType: ClaimType;
  policyDegree: 0 | 1 | 2 | 3;
  primaryDimension: number; // 1-12
  secondaryDimensions: number[]; // Max 2 numbers
  tags: string[];
  concretionDegree: number; // 0-4
  investmentWill: number; // 0-4
  accelerationContribution: number; // 0-5
  protectionContribution: number; // 0-5
  stateGovernanceContribution: number; // 0-5
  implementationMaturity: number; // 0-5
  evidenceStrength: number; // 0-5
  assessmentConfidence: AssessmentConfidence;
  nearAiFlag: boolean;
  campaignPracticeFlag: boolean;
  externalPressureFlag: boolean;
  reviewStatus: ReviewStatus;
  comment: string;
  sourceUrl?: string;
}

export interface Dimension {
  id: number;
  name: string;
  description: string;
}

export type PositionStatus =
  | 'Ingen bedömning'
  | 'Indikation'
  | 'Preliminär position'
  | 'Fast position'
  | 'Stark position';

export interface PartyAggregatedProfile {
  party: PartyAffiliation;
  status: PositionStatus;
  claimCount: number;
  weightedScoreCount: number;
  accelerationScore: number; // 0-5
  protectionScore: number; // 0-5
  governanceScore: number; // 0-5
  dimensionScores: Record<number, number>; // dimension ID -> score 0-5
  dimensionClaimsCount: Record<number, number>;
  dimensionStanceScores?: Record<number, { acceleration: number; protection: number; governance: number }>;
  stanceShifts?: Array<{ axis: 'Acceleration' | 'Protection' | 'Governance'; amount: number; oldScore: number; newScore: number }>;
}

export interface UserStance {
  accelerationScore: number;
  protectionScore: number;
  governanceScore: number;
  answers?: Record<number, number>; // { [questionId]: optionIndex }
  completedOptionalIds?: number[]; // list of answered optional questions
  weights?: Record<number, number>; // { [questionId]: weightValue }
  schemaVersion?: string; // e.g. 'v4.0'
}

export interface Feedback {
  id: string;
  name?: string;
  email?: string;
  category: 'Förbättringsförslag' | 'Felaktig data' | 'Allmän feedback' | 'Annat';
  message: string;
  page: string; // The tab where feedback was submitted
  timestamp: string; // ISO string
  resolved: boolean;
}

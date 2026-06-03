import type { PartyAffiliation } from '../types';

export const partyColorMap: Record<PartyAffiliation, string> = {
  S: '#E30613',       // Socialdemokraterna - Crimson Red
  M: '#52BDEC',       // Moderaterna - Sky Blue
  SD: '#005FA9',      // Sverigedemokraterna - Cornflower Blue
  C: '#009933',       // Centerpartiet - Emerald Green
  V: '#DA291C',       // Vänsterpartiet - Red
  MP: '#53A045',      // Miljöpartiet - Green
  L: '#009DDF',       // Liberalerna - Cyan Blue
  KD: '#003C71',      // Kristdemokraterna - Navy Blue
  Externt: '#64748B'  // External / Non-aligned - Slate Grey
};

export const partyNames: Record<PartyAffiliation, string> = {
  S: 'Socialdemokraterna',
  M: 'Moderaterna',
  SD: 'Sverigedemokraterna',
  C: 'Centerpartiet',
  V: 'Vänsterpartiet',
  MP: 'Miljöpartiet de Gröna',
  L: 'Liberalerna',
  KD: 'Kristdemokraterna',
  Externt: 'Externa aktörer'
};

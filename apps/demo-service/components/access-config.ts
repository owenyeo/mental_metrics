'use client';

import { deriveTierFromDistressScore, type AccessEndpoint, type Tier } from '@sil/shared';

export type SupportPreference =
  | 'self_guided'
  | 'someone_to_talk_to'
  | 'professional_support';

export interface QuestionnaireAnswers {
  ageBand: string;
  distressScore: number;
  crisisNow: boolean;
  supportPreference: SupportPreference;
}

export interface RecommendationContent {
  endpoint: AccessEndpoint;
  tier: Tier;
  label: string;
  title: string;
  summary: string;
  details: string;
  primaryCta: string;
  secondaryCta: string;
}

export const defaultQuestionnaireAnswers: QuestionnaireAnswers = {
  ageBand: '16-18',
  distressScore: 5,
  crisisNow: false,
  supportPreference: 'someone_to_talk_to',
};

export const recommendationContent: Record<AccessEndpoint, RecommendationContent> = {
  self_help: {
    endpoint: 'self_help',
    tier: 'at_risk',
    label: 'Self-guided support',
    title: 'Start with practical tools you can use right away',
    summary: 'Best for someone who wants a calm starting point and manageable next steps.',
    details:
      'This route points a young person to grounding tools, coping exercises, and a simple self-help plan while still making it easy to come back for more support later.',
    primaryCta: 'Open self-help plan',
    secondaryCta: 'Mark self-help session completed',
  },
  peer_support: {
    endpoint: 'peer_support',
    tier: 'distressed',
    label: 'Conversation support',
    title: 'Connect with someone who can help you talk it through',
    summary: 'Best for someone who needs to be heard before deciding on a bigger next step.',
    details:
      'This route prioritises reaching a supporter quickly, then connecting the person to additional resources if the need becomes more structured or urgent.',
    primaryCta: 'Request a conversation',
    secondaryCta: 'Mark chat support completed',
  },
  medical_referral: {
    endpoint: 'medical_referral',
    tier: 'unwell',
    label: 'Professional support',
    title: 'Move into a referral or appointment pathway',
    summary: 'Best for someone who likely needs more structured clinical support.',
    details:
      'This route prepares a provider handoff, starts referral activity, and makes the next action concrete so the person does not stall between screening and care.',
    primaryCta: 'Start referral',
    secondaryCta: 'Mark referral completed',
  },
  crisis_support: {
    endpoint: 'crisis_support',
    tier: 'unwell',
    label: 'Urgent support',
    title: 'Get immediate support options now',
    summary: 'Best for someone who may be unsafe, overwhelmed, or in immediate distress.',
    details:
      'This route elevates urgent help first and records the escalation path clearly so providers can detect crisis demand and missed follow-through.',
    primaryCta: 'Open urgent support options',
    secondaryCta: 'Mark urgent handoff completed',
  },
};

export const quickRouteOptions: Array<{
  endpoint: AccessEndpoint;
  tier: Tier;
  distressScore: number;
  title: string;
  description: string;
  cue: string;
}> = [
  {
    endpoint: 'self_help',
    tier: 'at_risk',
    distressScore: 3,
    title: 'I want tools I can try on my own',
    description: 'Short exercises, practical ideas, and low-pressure next steps.',
    cue: 'Good when someone wants a gentle starting point.',
  },
  {
    endpoint: 'peer_support',
    tier: 'distressed',
    distressScore: 6,
    title: 'I want to talk to someone first',
    description: 'A supportive conversation before deciding what comes next.',
    cue: 'Good when things feel heavy and talking would help.',
  },
  {
    endpoint: 'medical_referral',
    tier: 'unwell',
    distressScore: 8,
    title: 'I think I need professional support',
    description: 'A clearer path toward providers, referrals, and appointments.',
    cue: 'Good when symptoms feel persistent or intense.',
  },
  {
    endpoint: 'crisis_support',
    tier: 'unwell',
    distressScore: 10,
    title: 'I need urgent help right now',
    description: 'Immediate support options and direct escalation.',
    cue: 'Good when safety feels uncertain or distress is acute.',
  },
];

export function determineQuestionnaireRecommendation(
  answers: QuestionnaireAnswers,
): RecommendationContent {
  const tier = deriveTierFromDistressScore(answers.distressScore) ?? 'at_risk';

  if (answers.crisisNow || answers.distressScore >= 9) {
    return recommendationContent.crisis_support;
  }

  if (answers.supportPreference === 'professional_support' || answers.distressScore >= 8) {
    return recommendationContent.medical_referral;
  }

  if (answers.supportPreference === 'someone_to_talk_to' || tier === 'distressed') {
    return recommendationContent.peer_support;
  }

  return recommendationContent.self_help;
}

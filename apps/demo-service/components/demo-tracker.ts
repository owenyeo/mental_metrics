'use client';

import { createTracker } from '@sil/sdk';
import type { AccessEndpoint, Tier } from '@sil/shared';

const tracker = createTracker();
const STORAGE_KEY = 'demo_service_current_user_id';

let initialized = false;

function safeSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function initDemoTracker() {
  if (initialized) {
    return;
  }

  tracker.init({
    ingestUrl: process.env.NEXT_PUBLIC_INGEST_URL ?? 'http://localhost:4000/v1/events/ingest',
    projectKey: process.env.NEXT_PUBLIC_PROJECT_KEY ?? 'demo_project_key',
    flushIntervalMs: 1000,
  });

  initialized = true;
}

export async function trackAndFlush(
  eventName: Parameters<typeof tracker.track>[0],
  properties?: Parameters<typeof tracker.track>[1],
) {
  initDemoTracker();
  await tracker.track(eventName, properties);
  await tracker.flush();
}

export async function trackPage(screenName: string, source: string) {
  initDemoTracker();
  await tracker.page(screenName, { source });
  await tracker.flush();
}

export function getCurrentDemoUserId(): string | null {
  return safeSessionStorage()?.getItem(STORAGE_KEY) ?? null;
}

export async function beginDemoJourney(source: string, ageBand = '16-18') {
  initDemoTracker();
  tracker.reset();
  const userId = `demo-user-${Date.now()}`;
  tracker.identify(userId, { cohort: 'mindline-style-demo', ageBand });
  safeSessionStorage()?.setItem(STORAGE_KEY, userId);

  await trackAndFlush('access_intake_started', {
    source,
    intake_step: 'entry',
  });
  await trackAndFlush('screening_started', { source });

  return userId;
}

function endpointMeta(endpoint: AccessEndpoint) {
  if (endpoint === 'self_help') {
    return {
      referralDestination: 'self_help_library',
      interventionType: 'guided_self_help_plan',
    };
  }

  if (endpoint === 'peer_support') {
    return {
      referralDestination: 'peer_support_chat',
      interventionType: 'guided_chat_support',
    };
  }

  if (endpoint === 'medical_referral') {
    return {
      referralDestination: 'youth_mental_health_provider',
      interventionType: 'clinical_intake',
    };
  }

  return {
    referralDestination: 'urgent_support_line',
    interventionType: 'crisis_triage',
  };
}

export async function trackPathwayDetermination({
  tier,
  endpoint,
  distressScore,
  source,
}: {
  tier: Tier;
  endpoint: AccessEndpoint;
  distressScore?: number;
  source: string;
}) {
  const metadata = endpointMeta(endpoint);

  await trackAndFlush('access_step_completed', {
    intake_step: 'decision',
    source,
    tier,
    distress_score: distressScore,
  });
  await trackAndFlush('screening_completed', {
    distress_score: distressScore,
    tier,
  });
  await trackAndFlush('care_pathway_determined', {
    tier,
    access_endpoint: endpoint,
    referral_destination: metadata.referralDestination,
    intervention_type: metadata.interventionType,
    source,
  });

  if (tier === 'unwell') {
    await trackAndFlush('escalation_recommended', {
      tier,
      access_endpoint: endpoint,
      referral_destination: metadata.referralDestination,
      source,
    });
  }
}

export async function completeEndpointAction({
  endpoint,
  tier,
  primaryAction,
}: {
  endpoint: AccessEndpoint;
  tier: Tier;
  primaryAction: boolean;
}) {
  const metadata = endpointMeta(endpoint);

  if (primaryAction) {
    if (endpoint === 'self_help') {
      await trackAndFlush('intervention_viewed', {
        tier,
        access_endpoint: endpoint,
        intervention_type: metadata.interventionType,
      });
      await trackAndFlush('resource_clicked', {
        tier,
        access_endpoint: endpoint,
        source: 'self_help_plan',
      });
    } else if (endpoint === 'peer_support') {
      await trackAndFlush('chat_requested', {
        tier,
        access_endpoint: endpoint,
        referral_destination: metadata.referralDestination,
      });
    } else if (endpoint === 'medical_referral') {
      await trackAndFlush('referral_started', {
        tier,
        access_endpoint: endpoint,
        referral_destination: metadata.referralDestination,
      });
    } else {
      await trackAndFlush('crisis_button_clicked', {
        tier: 'unwell',
        access_endpoint: endpoint,
      });
      await trackAndFlush('referral_started', {
        tier: 'unwell',
        access_endpoint: endpoint,
        referral_destination: metadata.referralDestination,
      });
    }

    await trackAndFlush('access_flow_completed', {
      tier,
      access_endpoint: endpoint,
      referral_destination: metadata.referralDestination,
      intervention_type: metadata.interventionType,
    });
    return;
  }

  if (endpoint === 'self_help') {
    await trackAndFlush('intervention_started', {
      tier,
      access_endpoint: endpoint,
      intervention_type: metadata.interventionType,
    });
    await trackAndFlush('intervention_completed', {
      tier,
      access_endpoint: endpoint,
      intervention_type: metadata.interventionType,
      session_length_sec: 420,
    });
  } else {
    await trackAndFlush('referral_completed', {
      tier,
      access_endpoint: endpoint,
      referral_destination: metadata.referralDestination,
    });
    await trackAndFlush('appointment_booked', {
      tier,
      access_endpoint: endpoint,
    });
  }
}

export function resetDemoJourney() {
  tracker.reset();
  safeSessionStorage()?.removeItem(STORAGE_KEY);
}

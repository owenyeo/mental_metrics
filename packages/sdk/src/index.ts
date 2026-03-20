import { eventNameSchema } from '@sil/shared';
import type { EventName, EventProperties, IdentifyTraits, TrackerConfig } from '@sil/shared';

interface TrackerState {
  config?: TrackerConfig;
  anonymousId: string;
  sessionId: string;
  userId?: string;
  traits?: IdentifyTraits;
  queue: Array<{
    messageId: string;
    eventName: EventName;
    properties?: EventProperties;
    occurredAt: string;
  }>;
  flushTimer?: ReturnType<typeof setInterval>;
}

const ANON_KEY = 'sil_anonymous_id';
const SESSION_KEY = 'sil_session_id';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function safeStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function getOrCreate(storageKey: string, prefix: string): string {
  const storage = safeStorage();
  const existing = storage?.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const created = generateId(prefix);
  storage?.setItem(storageKey, created);
  return created;
}

function buildPayload(state: TrackerState) {
  if (!state.config || !state.queue.length) {
    return undefined;
  }

  return {
    events: state.queue.map((item) => ({
      messageId: item.messageId,
      userId: state.userId,
      anonymousId: state.anonymousId,
      sessionId: state.sessionId,
      eventName: item.eventName,
      occurredAt: item.occurredAt,
      properties: item.properties,
      traits: state.traits,
    })),
  };
}

async function flushQueue(state: TrackerState): Promise<void> {
  const payload = buildPayload(state);

  if (!payload || !state.config) {
    return;
  }

  const fetchImpl = state.config.fetchImpl ?? fetch;
  const batch = [...state.queue];

  for (let attempt = 0; attempt <= (state.config.maxRetries ?? 2); attempt += 1) {
    try {
      const response = await fetchImpl(state.config.ingestUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-project-key': state.config.projectKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Ingest failed with ${response.status}`);
      }

      state.queue = state.queue.filter((queued) => !batch.find((sent) => sent.messageId === queued.messageId));
      return;
    } catch {
      if (attempt === (state.config.maxRetries ?? 2)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}

export function createTracker() {
  const state: TrackerState = {
    anonymousId: getOrCreate(ANON_KEY, 'anon'),
    sessionId: getOrCreate(SESSION_KEY, 'session'),
    queue: [],
  };

  return {
    init(config: TrackerConfig) {
      state.config = config;

      if (state.flushTimer) {
        clearInterval(state.flushTimer);
      }

      state.flushTimer = setInterval(() => {
        void flushQueue(state);
      }, config.flushIntervalMs ?? 1500);
    },

    identify(userId: string, traits?: IdentifyTraits) {
      state.userId = userId;
      state.traits = traits;
    },

    async track(eventName: EventName, properties?: EventProperties) {
      eventNameSchema.parse(eventName);
      state.queue.push({
        messageId: generateMessageId(),
        eventName,
        properties,
        occurredAt: new Date().toISOString(),
      });

      if (state.queue.length >= 5) {
        await flushQueue(state);
      }
    },

    async page(screenName: string, properties?: EventProperties) {
      await this.track('page_viewed', {
        ...properties,
        page: screenName,
      });
    },

    reset() {
      state.userId = undefined;
      state.traits = undefined;
      state.queue = [];
      state.anonymousId = generateId('anon');
      state.sessionId = generateId('session');

      const storage = safeStorage();
      storage?.setItem(ANON_KEY, state.anonymousId);
      storage?.setItem(SESSION_KEY, state.sessionId);
    },

    async flush() {
      await flushQueue(state);
    },

    getState() {
      return {
        anonymousId: state.anonymousId,
        sessionId: state.sessionId,
        userId: state.userId,
        queueLength: state.queue.length,
      };
    },
  };
}

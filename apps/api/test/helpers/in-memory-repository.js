import { deriveTierFromDistressScore } from '@sil/shared';
export class InMemoryRepository {
    projects = [
        { id: 'project-1', name: 'Demo', projectKey: 'demo_project_key' },
    ];
    records = [];
    async findProjectByKey(projectKey) {
        return this.projects.find((project) => project.projectKey === projectKey) ?? null;
    }
    async persistBatch(project, events) {
        const accepted = events.map((event, index) => {
            const id = `event-${this.records.length + index + 1}`;
            this.records.push({
                id,
                userId: event.userId ?? event.anonymousId,
                occurredAt: event.occurredAt ?? new Date().toISOString(),
                eventName: event.eventName,
                tier: event.properties?.tier ?? deriveTierFromDistressScore(event.properties?.distress_score),
                interventionType: event.properties?.intervention_type,
                referralDestination: event.properties?.referral_destination,
                distressScore: event.properties?.distress_score,
            });
            return id;
        });
        return { accepted };
    }
    async listAnalyticsEvents(projectId, from, to) {
        if (projectId !== 'project-1') {
            return [];
        }
        return this.records.filter((record) => {
            const time = new Date(record.occurredAt).getTime();
            return time >= from.getTime() && time <= to.getTime();
        });
    }
}

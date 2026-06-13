/**
 * Queue service
 */
import api from './api';

export interface QueueEntry {
    id: string;
    establishment_id: string;
    service_id: string | null;
    preferred_staff_id: string | null;
    assigned_staff_id: string | null;
    position: number;
    status: 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled' | 'left';
    entered_at: string;
    called_at: string | null;
    started_at: string | null;
    estimated_wait_minutes?: number;
    people_ahead?: number;
}

export interface JoinQueueData {
    establishment_id: string;
    service_id?: string;
    preferred_staff_id?: string;
    latitude?: number;
    longitude?: number;
}

export const queueService = {
    join: (establishmentId: string, data?: Omit<JoinQueueData, 'establishment_id'>) =>
        api.post<QueueEntry>('/queue', {
            establishment_id: establishmentId,
            service_id: data?.service_id,
            preferred_staff_id: data?.preferred_staff_id,
            latitude: data?.latitude,
            longitude: data?.longitude,
        }),

    getMyQueues: () => api.get<QueueEntry[]>('/queue/my'),

    getEntry: (entryId: string) => api.get<QueueEntry>(`/queue/${entryId}`),

    getStatus: (entryId: string) => api.get<QueueEntry>(`/queue/${entryId}`),

    leave: (entryId: string) => api.delete(`/queue/${entryId}`),

    getEstablishmentQueue: (establishmentId: string) =>
        api.get<{ items: QueueEntry[]; total_waiting: number; current_serving: number }>(
            `/queue/establishments/${establishmentId}`
        ),
};

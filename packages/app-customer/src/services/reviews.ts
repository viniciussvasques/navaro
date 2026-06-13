/**
 * Reviews service
 */
import api from './api';

export interface CreateReviewData {
    establishment_id: string;
    appointment_id: string;
    staff_id?: string;
    rating: number;
    comment?: string;
}

export const reviewsService = {
    create: (data: CreateReviewData) =>
        api.post('/reviews', data),
};

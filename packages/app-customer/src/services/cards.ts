/**
 * Saved payment cards — API + cache local
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type CardType = 'credit' | 'debit';

export interface SavedCard {
    id: string;
    brand: string;
    last4: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    type: CardType;
    is_default?: boolean;
}

export interface SaveCardPayload {
    holder_name: string;
    number: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
    type: CardType;
}

const STORAGE_KEY = '@dunnaa:saved_cards';

function detectBrand(number: string): string {
    const n = number.replace(/\D/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(n)) return 'Elo';
    if (/^(606282|3841)/.test(n)) return 'Hipercard';
    return 'Cartão';
}

async function readLocalCards(): Promise<SavedCard[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as SavedCard[];
    } catch {
        return [];
    }
}

async function writeLocalCards(cards: SavedCard[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export const cardsService = {
    async list(): Promise<SavedCard[]> {
        try {
            const { data } = await api.get<SavedCard[]>('/payments/cards');
            if (Array.isArray(data) && data.length > 0) {
                await writeLocalCards(data);
                return data;
            }
        } catch {
            // fallback local
        }
        return readLocalCards();
    },

    async save(payload: SaveCardPayload): Promise<SavedCard> {
        const digits = payload.number.replace(/\D/g, '');
        const last4 = digits.slice(-4);
        const brand = detectBrand(digits);

        try {
            const { data } = await api.post<SavedCard>('/payments/cards', {
                holder_name: payload.holder_name,
                number: digits,
                exp_month: payload.exp_month,
                exp_year: payload.exp_year,
                cvv: payload.cvv,
                type: payload.type,
            });
            const local = await readLocalCards();
            await writeLocalCards([data, ...local.filter((c) => c.id !== data.id)]);
            return data;
        } catch {
            const card: SavedCard = {
                id: `local_${Date.now()}`,
                brand,
                last4,
                holder_name: payload.holder_name.trim(),
                exp_month: payload.exp_month,
                exp_year: payload.exp_year,
                type: payload.type,
                is_default: false,
            };
            const local = await readLocalCards();
            await writeLocalCards([card, ...local]);
            return card;
        }
    },

    async remove(cardId: string): Promise<void> {
        try {
            await api.delete(`/payments/cards/${cardId}`);
        } catch {
            // continue local removal
        }
        const local = await readLocalCards();
        await writeLocalCards(local.filter((c) => c.id !== cardId));
    },

    async setDefault(cardId: string): Promise<void> {
        const local = await readLocalCards();
        const next = local.map((c) => ({ ...c, is_default: c.id === cardId }));
        await writeLocalCards(next);
        try {
            await api.patch(`/payments/cards/${cardId}/default`);
        } catch {
            // local only
        }
    },
};

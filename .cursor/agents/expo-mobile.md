---
name: expo-mobile
description: Desenvolvedor React Native/Expo para apps DUNNAA (cliente e barbeiro). Use ao criar telas mobile, integrar API de agendamento, fila, auth SMS e consumir packages/shared.
---

Você desenvolve apps mobile DUNNAA com Expo.

## Apps

- **cliente**: buscar barbearias, agendar, fila, assinatura, favoritos, reviews
- **barbeiro** (DUNNAA Pro): agenda, fila, check-in QR, analytics, portfolio

## Stack

- Expo SDK 52+, Expo Router, TypeScript
- TanStack Query para API
- Auth JWT via `/api/v1/auth/send-code` + `/verify`

## Integração API

- Base: `EXPO_PUBLIC_API_URL` (dev: `http://localhost:8000/api/v1`)
- Contratos: `docs/API.md`
- Tipos: `packages/shared` (criar quando scaffoldar)

## Fluxos prioritários (MVP 1.0)

1. Auth SMS → home
2. Busca geo de establishments
3. Agendar serviço (availability → create appointment)
4. Fila virtual (entrar, ver posição, `/queue/my`)
5. Assinaturas (planos, uso)

## UX

- Português BR, formatação local (telefone, moeda, data)
- Loading/error states em todas as chamadas API
- Deep links para check-in quando aplicável

Ao scaffoldar app novo, use skill `scaffold-expo-app`.

# 🏗️ DUNNAA - Arquitetura para Escalabilidade

## Aplicações

| App | Plataforma | Stack | Público |
|-----|------------|-------|---------|
| **DUNNAA** | Mobile | Expo (React Native) | Clientes |
| **DUNNAA Pro** | Mobile | Expo (React Native) | Estabelecimentos |
| **DUNNAA Pro Web** | Web | Next.js | Estabelecimentos (desktop/tablet) |
| **Admin** | Web | Next.js | Equipe DUNNAA |

---

## Opções de Backend

### Comparativo de Tecnologias

| Tecnologia | Performance | Escalabilidade | Dev Speed | Ecossistema | Custo |
|-----------|-------------|----------------|-----------|-------------|-------|
| **FastAPI (Python)** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $ |
| **NestJS (Node)** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $ |
| **Go (Fiber/Gin)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | $ |
| **Elixir (Phoenix)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | $ |
| **Rust (Actix)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | $ |

---

## 🎯 Minha Recomendação: **FastAPI + Go Híbrido**

### Fase 1 (MVP): FastAPI Puro
- Desenvolvimento rápido
- Python é fácil de manter
- Suficiente para 100k usuários

### Fase 2 (Escala): Microsserviços críticos em Go
- Serviços de alta demanda (agendamento, fila) em Go
- FastAPI continua para admin, relatórios

---

## 🏛️ Arquitetura Evolutiva

### Fase 1: Monolito Modular (MVP)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOLITO MODULAR                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    FastAPI App                          │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│   │  │  Auth   │ │ Booking │ │  Queue  │ │ Payment │       │   │
│   │  │ Module  │ │ Module  │ │ Module  │ │ Module  │       │   │
│   │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│   │       │           │           │           │             │   │
│   │  ┌────┴───────────┴───────────┴───────────┴────┐       │   │
│   │  │              Service Layer                   │       │   │
│   │  └────────────────────┬────────────────────────┘       │   │
│   │                       │                                 │   │
│   │  ┌────────────────────┴────────────────────────┐       │   │
│   │  │            Repository Layer                  │       │   │
│   │  └────────────────────┬────────────────────────┘       │   │
│   └───────────────────────┼─────────────────────────────────┘   │
│                           │                                     │
│   ┌───────────────────────┼───────────────────────┐             │
│   │                       ▼                       │             │
│   │  ┌─────────────┐ ┌─────────────┐             │             │
│   │  │ PostgreSQL  │ │    Redis    │             │             │
│   │  │   (Data)    │ │  (Cache)    │             │             │
│   │  └─────────────┘ └─────────────┘             │             │
│   └───────────────────────────────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Capacidade**: ~50k usuários, ~1000 req/s

---

### Fase 2: Microsserviços Críticos (Escala)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                              │
│                            (Cloudflare/NGINX)                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
┌────────────────────┐ ┌────────────────┐ ┌────────────────────┐
│   API Gateway      │ │ Booking Svc    │ │    Queue Svc       │
│   (FastAPI)        │ │ (Go)           │ │    (Go)            │
│                    │ │                │ │                    │
│ • Auth             │ │ • Schedule     │ │ • Real-time queue  │
│ • Routing          │ │ • Availability │ │ • WebSockets       │
│ • Rate limiting    │ │ • High perf    │ │ • Notifications    │
└─────────┬──────────┘ └───────┬────────┘ └─────────┬──────────┘
          │                    │                    │
          │     ┌──────────────┼──────────────┐     │
          │     │              │              │     │
          ▼     ▼              ▼              ▼     ▼
     ┌─────────────────────────────────────────────────┐
     │                    Redis                        │
     │            (Cache + Pub/Sub + Queue)            │
     └─────────────────────────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
     ▼                      ▼                      ▼
┌──────────┐         ┌──────────┐          ┌──────────┐
│ Postgres │         │ Postgres │          │ Postgres │
│ Primary  │◄───────►│ Replica  │          │ Replica  │
└──────────┘         └──────────┘          └──────────┘
```

**Capacidade**: ~500k usuários, ~10k req/s

---

### Fase 3: Event-Driven (Grande Escala)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CDN + WAF                                    │
│                         (Cloudflare)                                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                    │
│                      (Kong / AWS API GW)                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────────┐
        │                        │                            │
        ▼                        ▼                            ▼
┌──────────────┐        ┌──────────────┐            ┌──────────────┐
│  Auth Svc    │        │ Booking Svc  │            │  Queue Svc   │
│  (FastAPI)   │        │    (Go)      │            │    (Go)      │
└──────┬───────┘        └──────┬───────┘            └──────┬───────┘
       │                       │                           │
       │                       ▼                           │
       │            ┌─────────────────────┐                │
       └───────────►│   Event Bus         │◄───────────────┘
                    │   (Kafka/NATS)      │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Payment Svc  │       │ Notif Svc    │       │ Analytics    │
│              │       │ (Workers)    │       │ Svc          │
└──────────────┘       └──────────────┘       └──────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   CockroachDB       │
                    │   (Multi-region)    │
                    └─────────────────────┘
```

**Capacidade**: ~10M usuários, ~100k req/s

---

## 📊 Stack Recomendada por Fase

### MVP (Fase 1)

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| **API** | FastAPI | Rápido de desenvolver, async |
| **Database** | PostgreSQL | Robusto, features avançadas |
| **Cache** | Redis | Sessions, cache, rate limit |
| **Background** | Celery | Jobs assíncronos |
| **Deploy** | Railway | Simples, barato |

### Escala (Fase 2)

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| **Booking** | Go + Fiber | Alta performance |
| **Queue** | Go + WebSocket | Real-time |
| **Message** | Redis Streams | Simples, rápido |
| **Database** | Postgres + Read Replicas | Escala leitura |
| **Deploy** | Kubernetes | Orquestração |

### Grande Escala (Fase 3)

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| **Event Bus** | Kafka/NATS | Alta throughput |
| **Database** | CockroachDB | Multi-region |
| **Cache** | Redis Cluster | Distribuído |
| **CDN** | Cloudflare | Global |
| **Deploy** | AWS EKS/GKE | Enterprise |

---

## 🔧 Padrões de Código

### Estrutura Modular (FastAPI)

```
packages/api/
├── app/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── schemas.py
│   │   ├── booking/
│   │   ├── queue/
│   │   ├── payment/
│   │   └── plugins/
│   │       ├── ads/
│   │       ├── marketing/
│   │       └── analytics/
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── events.py
│   └── main.py
```

### Plugin System

```python
# plugins/base.py
class PluginBase(ABC):
    @abstractmethod
    def on_install(self, establishment_id: UUID): ...
    
    @abstractmethod
    def on_uninstall(self, establishment_id: UUID): ...
    
    @abstractmethod
    def get_routes(self) -> APIRouter: ...

# plugins/ads/plugin.py
class AdsPlugin(PluginBase):
    def on_install(self, establishment_id: UUID):
        # Setup Stripe product for ads
        pass
    
    def get_routes(self) -> APIRouter:
        router = APIRouter(prefix="/ads")
        # Add routes
        return router
```

---

## 📈 Métricas de Escala

| Fase | Usuários | Req/s | Latência p99 | Infra/mês |
|------|----------|-------|--------------|-----------|
| MVP | 50k | 1k | <500ms | ~$100 |
| Escala | 500k | 10k | <200ms | ~$1k |
| Enterprise | 10M | 100k | <100ms | ~$10k |

---

## 🎯 Decisão Final

### Para o MVP: **FastAPI + PostgreSQL + Redis**

**Por quê?**
1. ✅ Desenvolvimento mais rápido (Python)
2. ✅ Fácil de encontrar devs
3. ✅ Suficiente para 100k usuários
4. ✅ Código modular permite migrar depois
5. ✅ Railway custa ~$20-50/mês

### Para Escalar

Quando chegar em **10k usuários ativos**:
1. Separar serviço de Booking em Go
2. Separar serviço de Queue em Go (WebSocket)
3. Adicionar read replicas no Postgres
4. Migrar para Kubernetes

---

*Última atualização: Fevereiro 2026*

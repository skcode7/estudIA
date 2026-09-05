# Estructura propuesta

```text
estudia/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── ...
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── subjects/
│       │   │   ├── topics/
│       │   │   ├── materials/
│       │   │   ├── questions/
│       │   │   ├── quizzes/
│       │   │   ├── progress/
│       │   │   └── ai/
│       │   │
│       │   └── infrastructure/
│       │       ├── database/
│       │       ├── identity/
│       │       │   └── authentico/
│       │       ├── storage/
│       │       └── ai/
│       │           └── deepseek/
│       │
│       └── prisma/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── docs/
├── docker-compose.yml
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Regla
No crear carpetas de infraestructura solo por anticipación si no contienen una implementación. Las fronteras pueden documentarse primero y materializarse cuando el MVP las necesite.

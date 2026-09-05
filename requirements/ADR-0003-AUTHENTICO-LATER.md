# ADR-0003 — Authentico en segunda etapa

## Estado
Aceptado

## Contexto
Authentico es el IAM existente para el ecosistema, pero el MVP será de uso individual.

## Decisión
No integrar Authentico en el MVP.

Se dejará una frontera `IdentityProvider` documentada/preparada para una integración futura.

## Consecuencia
No se introduce complejidad de identidad antes de necesitarla.

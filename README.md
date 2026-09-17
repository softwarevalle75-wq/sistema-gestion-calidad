# Sistema de Gestion de Calidad (QMS)

Plataforma web para la gestion de la calidad bajo ISO 9001: procesos, documentacion, indicadores, no conformidades, acciones correctivas, auditorias, riesgos, capacitaciones y competencias.

## Estructura del repositorio

- `backend/` — API REST con **FastAPI + PostgreSQL** (antes: [backend-fastapi](https://github.com/softwarevalle75-wq/backend-fastapi))
- `frontend/` — SPA con **React + TypeScript + Vite** (antes: [front-react](https://github.com/softwarevalle75-wq/front-react))

## Modulos principales

| Modulo | Descripcion |
|--------|-------------|
| **Usuarios** | Usuarios, areas, roles y permisos (RBAC) |
| **Procesos** | Procesos con ciclo PHVA, etapas e instancias |
| **Documentos** | Gestion documental con versionado |
| **Calidad** | Indicadores, no conformidades y acciones correctivas |
| **Auditorias** | Auditorias internas/externas y hallazgos |
| **Riesgos** | Gestion de riesgos con matriz probabilidad-impacto |
| **Capacitaciones** | Programacion, asistencia y certificacion |
| **Sistema** | Tickets, notificaciones y configuraciones |

## Documentacion

- `backend/README.md` — levantar el backend (Docker Compose: FastAPI + PostgreSQL + pgAdmin)
- `frontend/README.md` y `frontend/INSTALACION.md` — setup del frontend

> Este repositorio unifica los repos `backend-fastapi` y `front-react`. El historial de Git de ambos esta preservado en este repositorio.

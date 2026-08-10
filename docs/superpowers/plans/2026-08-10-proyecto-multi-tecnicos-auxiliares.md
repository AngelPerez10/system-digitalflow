# Multi técnicos/auxiliares — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Allow multiple technicians (one responsible) and multiple auxiliares on a proyecto; all assignees see/edit it under `own_only`.

**Architecture:** JSON lists `tecnicos`/`auxiliares` + sync legacy FKs; hydrate from FK on read when lists empty.

**Tech Stack:** Django/DRF, React/TS, existing MultiSelect / SearchableSelect patterns.

## Tasks

- [ ] Backend model + migration
- [ ] Serializer normalize/sync + validation
- [ ] Views own_only + tipos_trabajo actor
- [ ] Backend tests
- [ ] Frontend types/API/form utils
- [ ] Multi-select field UI + form state
- [ ] List filter/display
- [ ] Frontend checks

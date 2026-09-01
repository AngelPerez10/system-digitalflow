# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

La v1 se distribuye como APK sideload (sin tiendas). iOS es un no-goal explícito del
handoff, aunque el proyecto corre en SDK 54 y por eso también abre en Expo Go de iPhone
durante el desarrollo.

## Stack

Existente: Expo (React Native) + TypeScript strict, Expo Router. SDK anclado a 54 porque es
el que traen las Expo Go publicadas en las tiendas.

## Users

Dos perfiles, un mismo backend. Antes del login la app pregunta cuál es (pantalla de
bienvenida); la elección se recuerda para no repetir la pregunta.

**Técnicos de campo de Sertel** (perfil principal). Trabajan **mixto**: parte del día en
taller u oficina con buena luz y parte en sitio del cliente, a la intemperie. Usan su
propio teléfono Android.

**Clientes de Sertel** (perfil de **solo seguimiento**). Entran con una cuenta de portal para
ver el avance de sus servicios: **no crean ni editan nada**, ni siquiera cambian el estatus de
una orden. En el primer ingreso cambian la contraseña temporal que les llegó por correo y
después ven la lista de sus órdenes y el resumen de cada una (estado, fechas, técnico
asignado, lo reportado, lo que se hizo, fotos y su firma).

Lo único que el cliente **aporta** es la **calificación del técnico** al cerrar el servicio:
cinco estrellas y un comentario opcional, como al terminar un viaje. Solo cuando la orden
queda resuelta y una sola vez por orden. Sirve para medir la calidad del servicio en campo.

Entran a la app para atender **órdenes de trabajo** asignadas: ver las suyas del mes,
abrirlas, cambiar su estatus (pendiente / pausado / resuelto), registrar el motivo de una
pausa, el comentario técnico, los horarios de inicio y término, fotos de evidencia y la
firma del cliente.

En el login concreto: es la primera pantalla del día. El técnico teclea las **mismas
credenciales del ERP web** que ya usa. No es una pantalla donde se le persuade de nada;
es un umbral que debe cruzarse rápido y sin fricción, con dedos posiblemente sucios o
apurados, bajo luz variable.

## Product Purpose

Llevar al campo la parte del ERP DigitalFlow que el técnico necesita en sitio, sin obligarlo
a abrir el portal web en un navegador móvil. La app es una superficie nueva sobre el
**mismo backend Django**: mismos usuarios, mismos permisos, misma base de datos.

Éxito: el técnico abre la app, ve sus órdenes del mes y deja registrado lo que hizo, sin
llamar a oficina.

## Positioning

No es un ERP móvil genérico ni un portal web envuelto: es la vista de campo del sistema que
la empresa ya opera. La autorización la decide siempre el servidor (`OrdenesPermission`,
`edit_scope`, `own_only`); la app solo muestra lo que a ese usuario le corresponde.

## Constraints

- **Autenticación**: Bearer + `expo-secure-store`, no cookies. El login exige que el backend
  entregue `refresh` en el cuerpo, y solo lo hace ante `X-Client: mobile`.
- **Errores**: la UI nunca muestra cuerpos de respuesta que no sean JSON (una página de
  depuración de Django llegó a filtrarse a la pantalla). Ver `src/api/errors.ts`.
- **Textos**: español de México, con tildes correctas.
- **Accesibilidad**: objetivos táctiles ≥ 44 px, etiquetas en todo control sin texto visible.
- **Sin dependencias nuevas** si Expo/RN ya cubren el caso; cada librería nueva se justifica.

## Brand

**Sin identidad previa.** No existe logotipo ni paleta propia de SertelPro (decisión del
usuario, 2026-08-26). La app **no** está obligada a heredar el naranja `#ff801f` del ERP web:
tiene libertad para definir su propio mundo visual.

El nombre del producto en la app es **SertelPro**.

Desde 2026-09-01 las vistas del técnico (lista, detalle y edición de órdenes) comparten el
mismo lenguaje visual **marino + dorado** del acceso y del portal del cliente —banda marina de
cabecera + hoja blanca—. Es un cambio de presentación: no altera la funcionalidad, los datos
que se muestran ni los permisos de edición.

## Alcance del login

**Técnico**: iniciar sesión (usuario o correo + contraseña). Sin recordar usuario, sin
biometría, sin registro ni recuperación de contraseña (esas se gestionan desde el ERP).

**Cliente**: además del inicio de sesión, **sí hay registro** — `registro-cliente` envía una
solicitud (`POST /api/portal-cliente/registro/`); no da acceso inmediato: un administrador la
revisa y las credenciales llegan por correo. Esa contraseña es **temporal**: en el primer
ingreso la app obliga a cambiarla (`/cliente/cambiar-contrasena`) antes de mostrar el portal.
La recuperación de contraseña olvidada sigue fuera de la app.

Antes del formulario, el usuario elige **Soy técnico** o **Soy cliente**; según eso va a
`/login` o `/login-cliente`. Ambos usan el mismo formulario (`AccesoForm`), difieren en el
texto, el destino y el enlace de registro (solo cliente). La elección se guarda al tocar la
tarjeta (SecureStore) y un usuario recurrente se salta la bienvenida; «Cambiar de perfil» la
olvida y la vuelve a pedir.

**Sí** lleva mostrar/ocultar contraseña: en campo, con teclado pequeño y prisa, evita el
intento fallido (decisión del usuario, 2026-08-26; revierte la decisión previa).

**El lenguaje de la pantalla no asume conocimientos de software.** Quien la usa es un técnico
de campo, no un informático: nada de «credenciales», «ERP», «administrador de sistema» ni
datos de servidor a la vista. Los mensajes del backend se traducen a lenguaje del oficio
antes de mostrarse (`mensajeDeAcceso` en `src/features/auth/AccesoForm.tsx`).

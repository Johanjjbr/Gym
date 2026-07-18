# Plan: Build y actualización de la App Android (Capacitor)

## Visión General

Este proyecto usa **Capacitor** para empaquetar la web app React como una aplicación Android nativa. Cualquier modificación en el código fuente requiere reconstruir la app para que los cambios se reflejen en el APK/AAB.

---

## Flujo después de hacer cambios en el código

Cada vez que se modifique el código (componentes, páginas, rutas, estilos, etc.):

### 1. Construir web + copiar a Android

```bash
npm run mobile:build
```

Esto ejecuta:
1. `vite build` — compila la web app a `dist/`
2. `npx cap copy` — copia `dist/` a `android/app/src/main/assets/public/`

### 2. (Opcional) Abrir Android Studio para generar APK

```bash
npm run mobile:open
```

Desde Android Studio:
- **Debug APK** (compartir con testers): `Build → Build Bundle(s) / APK(s) → Build APK(s)`
- **Release AAB** (Play Store): `Build → Generate Signed Bundle / APK → Android App Bundle`

---

## Configuraciones actuales

### `capacitor.config.json`

| Campo | Valor |
|---|---|
| `appId` | `com.losteques.gymapp` |
| `appName` | `Gimnasio Los Teques` |
| `webDir` | `dist` |
| `androidScheme` | `https` |
| SplashScreen bg | `#0a0a0f` |

### Splash Screen

Configurado en `capacitor.config.json` (2s de duración, fondo oscuro). Si se desea personalizar:
- Editar `android/app/src/main/res/drawable/splash.xml`
- O usar Android Studio para cambiar el drawable

### Íconos

| Tipo | Ubicación |
|---|---|
| SVG fuente | `public/icon.svg` |
| PNG PWA | `public/icons/icon-*.png` |
| Android mipmap | `android/app/src/main/res/mipmap-*/ic_launcher*.png` |

Para regenerar todos los íconos:
```bash
npm run icons                    # PWA icons from public/icon.svg
```

Los íconos de Android se generaron manualmente desde `public/icon.svg`. Si se quiere actualizar el ícono de la app:
1. Reemplazar `public/icon.svg`
2. Ejecutar: `node scripts/generate-icons.mjs` (PWA)
3. Ejecutar: `node scripts/generate-android-icons.mjs` (Android)
4. Reconstruir: `npm run mobile:build`

---

## Plugins de Capacitor disponibles

Actualmente solo `@capacitor/android` está instalado. Si se agregan funcionalidades nativas:

```bash
npm install @capacitor/camera @capacitor/geolocation @capacitor/push-notifications
npx cap sync
```

Después de instalar un plugin, siempre ejecutar `npx cap sync`.

---

## Publicación en Play Store

### Requisitos

1. **Cuenta de desarrollador Google Play** ($25 USD, pago único)
2. **Keystore** para firmar la app (generado en Android Studio)
3. **Android App Bundle (AAB)** — formato requerido por Play Store

### Pasos finales

1. En Android Studio: `Build → Generate Signed Bundle / APK → Android App Bundle`
2. Crear o seleccionar keystore existente
3. Completar el formulario de firma
4. Subir el `.aab` generado a [Google Play Console](https://play.google.com/console)
5. Completar ficha de Play Store (descripción, fotos, categoría, calificación de contenido)

### Consideraciones para producción

- Revisar que `VITE_SUPABASE_PROJECT_ID` y `VITE_SUPABASE_ANON_KEY` en `.env` apunten a **producción**
- Verificar que la app funcione correctamente en modo offline si es necesario
- Probar en dispositivos físicos antes de publicar

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run build` | Build web estándar |
| `npm run mobile:build` | Build web + copia a Android |
| `npm run mobile:sync` | Sincroniza plugins de Capacitor con Android |
| `npm run mobile:open` | Abre el proyecto en Android Studio |
| `npm run mobile:icons` | Regenera íconos PWA desde el SVG |
| `node scripts/generate-android-icons.mjs` | Regenera íconos de Android desde el SVG |

---

## Estructura de archivos relacionados

```
/
├── capacitor.config.json        # Configuración de Capacitor
├── public/
│   ├── icon.svg                 # Icono fuente (SVG)
│   ├── manifest.json            # PWA manifest
│   └── icons/
│       └── icon-*.png          # PWA icons generados
├── scripts/
│   ├── generate-icons.mjs       # Genera PWA icons desde SVG
│   └── generate-android-icons.mjs  # Genera Android icons desde SVG
├── android/                     # Proyecto Android nativo
│   └── app/
│       ├── src/main/
│       │   ├── AndroidManifest.xml
│       │   ├── assets/public/   # Web app compilada (copia de dist/)
│       │   └── res/
│       │       ├── mipmap-*/    # Android launcher icons
│       │       └── drawable/    # Splash screen
│       └── build.gradle
└── dist/                        # Build web (no editar manualmente)
```

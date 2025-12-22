# Guía de Trabajo con Git para Frontend

Esta guía describe el flujo de trabajo recomendado para mantener el código ordenado y seguro.

## Resumen del Flujo
El flujo ideal ("Buenas Prácticas") es **Gitflow simplificado**:
1.  **`main`**: Código de producción (lo que ve el cliente). **Nunca** trabajar directo aquí.
2.  **`develop`**: Rama de integración (donde se juntan los cambios de todos).
3.  **`feature/...`**: Ramas de trabajo temporal para cada tarea nueva.

---

## Instrucciones Paso a Paso

### 1. Preparar el Entorno
Si es la primera vez:
```bash
git clone https://repo.prosys.cl/pcastillo/flowsure-landing.git
cd flowsure-landing
```

### 2. Empezar una Tarea Nueva
Siempre crea una rama nueva desde `develop`. No trabajes directo en `develop` para evitar conflictos con otros compañeros.

```bash
# 1. Asegúrate de tener lo último de develop
git checkout develop
git pull origin develop

# 2. Crea tu rama para el cambio (usa un nombre descriptivo)
# Ejemplo: feature/cambios-home, fix/boton-roto
git checkout -b feature/nombre-de-tu-cambio
```

### 3. Guardar Cambios
Haz tus cambios en el código y ve guardando:

```bash
git status              # Ver qué archivos cambiaste
git add .               # Agregar todos los cambios (o git add archivo.js)
git commit -m "Descripción clara de lo que hiciste"
```
> Es importante que escribas buenas descripciones en tus commits. vscode tiene un generador de mensajes.

### 4. Subir Cambios
Sube tu rama al servidor ("remote"):

```bash
git push -u origin feature/nombre-de-tu-cambio
```

### 5. Crear Pull Request (PR)
1.  Ve al repositorio en el navegador.
2.  Crea un **Pull Request** comparando tu rama `feature/...` contra `develop`.
3.  **¿Por qué a develop?** Porque así probamos que tu código no rompa nada junto con el de los demás antes de pasar a producción (`main`).

### 6. Pasar a Producción
Una vez que `develop` tiene los cambios probados, el líder técnico o encargado hace un PR de `develop` hacia `main` para liberar la nueva versión.

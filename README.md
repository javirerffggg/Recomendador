
## 🛠️ Tecnologías Utilizadas

| Tecnología | Propósito |
|------------|-----------|
| **HTML5** | Estructura semántica |
| **CSS3** | Estilos y animaciones |
| **JavaScript (ES6+)** | Lógica de la aplicación |
| **Spotify Web API** | Recomendaciones musicales |
| **Service Workers** | Funcionalidad offline |
| **Web App Manifest** | Instalación PWA |
| **Fetch API** | Peticiones HTTP |
| **OAuth 2.0** | Autenticación segura |

## 📥 Instalación y Configuración

### Paso 1: Clonar el Repositorio

git clone https://github.com/tu-usuario/music-recommender-pwa.git
cd music-recommender-pwa

text

### Paso 2: Configurar Spotify API

1. Ve al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Inicia sesión con tu cuenta de Spotify
3. Haz clic en **"Create app"**
4. Completa el formulario:
   - **App name**: Music Recommender PWA
   - **App description**: PWA para recomendaciones musicales
   - **Redirect URI**: `https://tu-usuario.github.io/music-recommender-pwa/`
   - Marca la casilla "Web API"
5. Copia tu **Client ID**
6. Abre el archivo `app.js` y reemplaza:

const CLIENT_ID = 'TU_CLIENT_ID_AQUI';

text

### Paso 3: Crear Iconos

Necesitas dos iconos para la PWA:
- `icon-192.png` (192x192 píxeles)
- `icon-512.png` (512x512 píxeles)

Puedes generarlos usando:
- [Favicon Generator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://www.npmjs.com/package/pwa-asset-generator)
- Cualquier editor de imágenes

### Paso 4: Desplegar en GitHub Pages

Asegúrate de estar en la rama main

git checkout main
Añade todos los archivos

git add .
Haz commit

git commit -m "Deploy Music Recommender PWA"
Sube a GitHub

git push origin main

text

Luego en GitHub:
1. Ve a **Settings** → **Pages**
2. En **Source**, selecciona **Deploy from a branch**
3. Elige **main** y **/ (root)**
4. Haz clic en **Save**
5. Espera 2-3 minutos y tu app estará disponible en:

https://tu-usuario.github.io/music-recommender-pwa/

text

### Paso 5: Actualizar Redirect URI

Vuelve al Spotify Developer Dashboard y actualiza la Redirect URI con tu URL final de GitHub Pages.

## 📱 Cómo Usar la Aplicación

### 1. **Conectar con Spotify**
- Abre la aplicación
- Haz clic en **"Iniciar sesión con Spotify"**
- Autoriza los permisos solicitados

### 2. **Cargar tu Playlist**
- Arrastra tu archivo de playlist a la zona de carga
- O haz clic para seleccionar el archivo desde tu dispositivo
- La app detectará automáticamente el formato

### 3. **Obtener Recomendaciones**
- La aplicación analiza las primeras 5 canciones como "semillas"
- Genera 20 recomendaciones basadas en similitud musical
- Visualiza las sugerencias con carátulas y artistas

### 4. **Explorar y Guardar**
- Haz clic en cualquier canción para abrirla en Spotify
- Usa el botón **"Crear Playlist en Spotify"** para guardar todas las recomendaciones
- La playlist se creará automáticamente en tu cuenta

## 🔧 Estructura del Proyecto

music-recommender-pwa/
│
├── index.html # Página principal
├── styles.css # Estilos de la aplicación
├── app.js # Lógica principal
├── sw.js # Service Worker
├── manifest.json # Manifest de PWA
├── icon-192.png # Icono 192x192
├── icon-512.png # Icono 512x512
└── README.md # Este archivo

text

## 🎯 Algoritmo de Recomendación

La aplicación utiliza el endpoint `/recommendations` de la API de Spotify, que se basa en:

1. **Análisis Acústico**: Tempo, energía, valencia, instrumentalidad
2. **Similitud de Artistas**: Géneros y estilos musicales relacionados
3. **Popularidad**: Balance entre canciones conocidas y descubrimientos
4. **Características Musicales**: Tonalidad, modo, acústica, bailabilidad

## 🔒 Privacidad y Seguridad

- **No almacenamos datos**: Toda la información se procesa localmente
- **OAuth 2.0**: Autenticación segura con tokens temporales
- **HTTPS Obligatorio**: GitHub Pages sirve contenido sobre HTTPS
- **Sin tracking**: No se utilizan herramientas de análisis externas
- **Código Abierto**: Todo el código es auditable públicamente

## 🐛 Solución de Problemas

### Error: "Service Worker no disponible"
- Asegúrate de acceder a la app vía HTTPS
- Verifica que el Service Worker esté registrado en DevTools → Application

### Error: "Token inválido"
- Vuelve a iniciar sesión con Spotify
- Verifica que el Client ID esté correctamente configurado

### Las recomendaciones no son relevantes
- Asegúrate de que tu playlist tenga al menos 5 canciones
- Usa playlists más homogéneas para mejores resultados

### No puedo instalar la PWA
- Verifica que `manifest.json` esté accesible
- Los iconos deben existir y tener los tamaños correctos
- Revisa la consola en DevTools → Application

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [ ] Soporte para más formatos de playlist (XML, XSPF)
- [ ] Filtros avanzados (género, año, popularidad)
- [ ] Historial de recomendaciones
- [ ] Modo claro/oscuro configurable
- [ ] Análisis de audio con visualizaciones
- [ ] Compartir recomendaciones vía enlace
- [ ] Integración con Apple Music y YouTube Music

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👤 Autor

**Tu Nombre**
- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@ejemplo.com

## 🙏 Agradecimientos

- [Spotify Web API](https://developer.spotify.com/documentation/web-api) por su excelente documentación
- [GitHub Pages](https://pages.github.com/) por el hosting gratuito
- Comunidad de desarrolladores PWA

## 📊 Estadísticas

![GitHub stars](https://img.shields.io/github/stars/tu-usuario/music-recommender-pwa?style=social)
![GitHub forks](https://img.shields.io/github/forks/tu-usuario/music-recommender-pwa?style=social)
![GitHub issues](https://img.shields.io/github/issues/tu-usuario/music-recommender-pwa)

---

⭐ Si este proyecto te ha sido útil, considera darle una estrella en GitHub

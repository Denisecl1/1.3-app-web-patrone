const API_URL =
    "https://1-3-app-web-patrone.vercel.app/api/analyze";

const form = document.getElementById("analyzeForm");
const fileInput = document.getElementById("imageInput");
const promptInput = document.getElementById("promptInput");
const preview = document.getElementById("preview");
const analyzeButton = document.getElementById("analyzeButton");
const result = document.getElementById("result");
const statusText = document.getElementById("statusText");

const dropZone = document.body;

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

let imageData = "";

function procesarArchivo(file) {
    imageData = "";
    preview.removeAttribute("src");
    analyzeButton.disabled = true;
    result.textContent = "Selecciona una imagen para comenzar.";

    if (!file) {
        return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        result.textContent = "Formato no permitido. Usa JPG, PNG o WebP.";
        fileInput.value = "";
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        result.textContent = "La imagen debe pesar como máximo 3 MB.";
        fileInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        imageData = reader.result;
        preview.src = imageData;
        analyzeButton.disabled = false;
        result.innerHTML = "<p>Imagen lista para analizar.</p>";
    };

    reader.readAsDataURL(file);
}

fileInput.addEventListener("change", () => {
    procesarArchivo(fileInput.files[0]);
});

// Eventos Drag and Drop
dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.style.opacity = "0.7"; 
});

dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dropZone.style.opacity = "1"; 
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.style.opacity = "1"; 

    if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        fileInput.files = event.dataTransfer.files; 
        procesarArchivo(file); 
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!imageData) {
        result.innerHTML = "<p>Primero selecciona una imagen.</p>";
        return;
    }

    analyzeButton.disabled = true;
    statusText.textContent = "● Analizando...";
    result.innerHTML = "<p>La IA está analizando los patrones visuales...</p>";

    try {
        const contextoEspecializado = `Actúa como un ingeniero especialista en TIC. Analiza la imagen y enfócate EXCLUSIVAMENTE en identificar componentes electrónicos, equipo de cómputo, servidores, cableado o herramientas. 
        Devuelve tu respuesta ÚNICAMENTE como un objeto JSON válido con la siguiente estructura exacta:
        {
          "descripcion_general": "Breve descripción de lo que ves",
          "patrones": [
            { "nombre": "Nombre del objeto", "cantidad_estimada": "Número o cantidad", "certeza": "Alto/Medio/Bajo" }
          ],
          "evidencia": "Qué elementos visuales usaste para identificar los objetos"
        }
        No escribas texto adicional fuera del JSON. Petición del usuario: `;
        
        const promptFinal = contextoEspecializado + promptInput.value.trim();

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                image_data: imageData,
                prompt: promptFinal 
            })
        });

        // ==========================================
        // RETO 5: MANEJO DE ERRORES HTTP DEL SERVIDOR
        // ==========================================
        if (!response.ok) {
            let errorMsg = "Error desconocido del servidor.";
            
            if (response.status === 400) {
                errorMsg = "Error 400: Formato de imagen no permitido o código Base64 inválido.";
            } else if (response.status === 403) {
                errorMsg = "Error 403: Acceso denegado. Revisa las credenciales o permisos de la API.";
            } else if (response.status === 413) {
                errorMsg = "Error 413: El archivo es demasiado grande para procesarse.";
            } else if (response.status === 500) {
                errorMsg = "Error 500: Error interno del modelo de IA o fallo en el servidor.";
            }
            
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // ==========================================
        // RETO 6: GENERACIÓN DE TARJETAS CON CLASES CSS
        // ==========================================
        try {
            const jsonLimpio = data.analysis.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResultado = JSON.parse(jsonLimpio);

            let tarjetasHTML = `
                <div class="res-block">
                    <h3 class="res-title"><span>📋</span> Descripción General</h3>
                    <p>${jsonResultado.descripcion_general}</p>
                </div>
                
                <h3 style="color: #0f172a; margin-bottom: 15px;">💻 Componentes Identificados</h3>
                <div class="res-grid">
            `;

            jsonResultado.patrones.forEach(item => {
                // Lógica de colores según certeza
                let certeza = item.certeza ? item.certeza.toLowerCase() : '';
                let claseCerteza = certeza.includes('alto') ? 'alto' : certeza.includes('medio') ? 'medio' : 'bajo';
                
                // Lógica matemática para la barra
                let cantidad = parseInt(item.cantidad_estimada) || 1;
                let anchoBarra = Math.min(cantidad * 10, 100);

                tarjetasHTML += `
                    <div class="res-card borde-${claseCerteza}">
                        <div class="res-card-header">
                            <h4>${item.nombre}</h4>
                            <span class="badge ${claseCerteza}">
                                Certeza: ${item.certeza}
                            </span>
                        </div>
                        
                        <div class="res-card-qty">
                            <strong>Cantidad detectada:</strong> ${item.cantidad_estimada}
                        </div>
                        
                        <div class="progress-bg">
                            <div class="progress-fill" style="width: ${anchoBarra}%;"></div>
                        </div>
                    </div>
                `;
            });

            tarjetasHTML += `
                </div>
                <div class="res-block evidence">
                    <h3 class="res-title evidence"><span>🔍</span> Evidencia Visual</h3>
                    <p>${jsonResultado.evidencia}</p>
                </div>
            `;

            result.innerHTML = tarjetasHTML;

        } catch (parseError) {
            result.innerHTML = `
                <div class="error-card">
                    <h4>⚠️ Formato inválido</h4>
                    <p>El modelo no devolvió el formato JSON correctamente.</p>
                </div>`;
        }

        statusText.textContent = "● Análisis terminado";
    }
    catch (error) {
        // ==========================================
        // RETO 5: DETECCIÓN DE ERRORES DE RED Y CORS
        // ==========================================
        let mensajeMostrar = error.message;
        
        if (error.name === "TypeError") {
            mensajeMostrar = "Error de CORS o de conexión de red. Verifica que tu backend permite peticiones desde este dominio.";
        }

        result.innerHTML = `
            <div class="error-card">
                <h4>⚠️ Ocurrió un problema</h4>
                <p>${mensajeMostrar}</p>
            </div>
        `;
        statusText.textContent = "● Error";
    }
    finally {
        analyzeButton.disabled = false;
    }
});
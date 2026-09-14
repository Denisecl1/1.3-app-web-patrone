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
        // ==========================================
        // RETO 4: PROMPT PARA ESTRUCTURA JSON
        // ==========================================
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Error del servidor");
        }

        // ==========================================
        // RETO 4: CONVERSIÓN DE JSON A TARJETAS HTML
        // ==========================================
        try {
            // Limpiamos el texto por si la IA le agrega comillas invertidas de código Markdown (```json)
            const jsonLimpio = data.analysis.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Transformamos el texto a un objeto JavaScript
            const jsonResultado = JSON.parse(jsonLimpio);

            // Armamos el HTML con diseño de tarjetas directamente desde JavaScript
            let tarjetasHTML = `
                <div style="background: #1e293b; padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">
                    <h3 style="margin-top: 0; color: #60a5fa;">Descripción General</h3>
                    <p>${jsonResultado.descripcion_general}</p>
                </div>
                
                <h3 style="color: #333;">Componentes Identificados</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
            `;

            // Iteramos sobre cada patrón encontrado y creamos una tarjetita
            jsonResultado.patrones.forEach(item => {
                tarjetasHTML += `
                    <div style="background: #2563eb; color: white; padding: 15px; border-radius: 8px; flex: 1 1 200px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #60a5fa; padding-bottom: 5px;">${item.nombre}</h4>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Cantidad:</strong> ${item.cantidad_estimada}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Certeza:</strong> ${item.certeza}</p>
                    </div>
                `;
            });

            // Agregamos la última tarjeta de Evidencia
            tarjetasHTML += `
                </div>
                <div style="background: #334155; padding: 15px; border-radius: 8px; color: white;">
                    <h3 style="margin-top: 0; color: #60a5fa;">Evidencia Visual</h3>
                    <p>${jsonResultado.evidencia}</p>
                </div>
            `;

            // Insertamos todo el HTML en la caja de resultados
            result.innerHTML = tarjetasHTML;

        } catch (parseError) {
            console.error("Error convirtiendo JSON:", parseError);
            result.innerHTML = `<p style="color: red;">Error: La IA no devolvió el formato esperado.</p><pre>${data.analysis}</pre>`;
        }

        statusText.textContent = "● Análisis terminado";
    }
    catch (error) {
        result.innerHTML = "<p>Error: " + error.message + "</p>";
        statusText.textContent = "● Error";
    }
    finally {
        analyzeButton.disabled = false;
    }
});
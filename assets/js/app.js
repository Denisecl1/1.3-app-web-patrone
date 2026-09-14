const API_URL =
    "https://1-3-app-web-patrone.vercel.app/api/analyze";

const form = document.getElementById("analyzeForm");
const fileInput = document.getElementById("imageInput");
const promptInput = document.getElementById("promptInput");
const preview = document.getElementById("preview");
const analyzeButton = document.getElementById("analyzeButton");
const result = document.getElementById("result");
const statusText = document.getElementById("statusText");

// Definimos la zona donde se podrá soltar la imagen (toda la página)
const dropZone = document.body;

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

let imageData = "";

// ==========================================
// NUEVA FUNCIÓN: Procesa el archivo recibido
// ==========================================
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
        result.textContent = "Imagen lista para analizar.";
    };

    reader.readAsDataURL(file);
}

// 1. Cuando se usa el botón de "Seleccionar archivo"
fileInput.addEventListener("change", () => {
    procesarArchivo(fileInput.files[0]);
});

// ==========================================
// EVENTOS DE DRAG AND DROP (RETO 3)
// ==========================================
dropZone.addEventListener("dragover", (event) => {
    event.preventDefault(); // Evita que el navegador abra la imagen en otra pestaña
    dropZone.style.opacity = "0.7"; // Efecto visual al arrastrar
});

dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dropZone.style.opacity = "1"; // Restaura la opacidad normal
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.style.opacity = "1"; 

    // Verifica si se soltó un archivo
    if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        fileInput.files = event.dataTransfer.files; // Sincroniza con el input oculto
        procesarArchivo(file); // Reutiliza la función para procesarlo
    }
});
// ==========================================

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!imageData) {
        result.textContent = "Primero selecciona una imagen.";
        return;
    }

    analyzeButton.disabled = true;
    statusText.textContent = "● Analizando...";
    result.textContent = "La IA está analizando los patrones visuales...";

    try {
        // 1. CREACIÓN DEL CONTEXTO (RETO 1 + RETO 2):
        const contextoEspecializado = "Actúa como un ingeniero especialista en Tecnologías de la Información y Comunicaciones (TIC). Analiza la imagen y enfócate EXCLUSIVAMENTE en identificar componentes electrónicos, equipo de cómputo, servidores, cableado, refacciones o herramientas de laboratorio. Organiza tu respuesta por categorías. Para cada categoría encontrada indica estrictamente: 1) Nombre del patrón u objeto, 2) Cantidad estimada, y 3) Nivel de certeza (Alto, Medio, Bajo). Ignora los objetos que no pertenezcan al ámbito de las TIC. Petición del usuario: ";
        
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
            throw new Error(
                data.error || "Error del servidor"
            );
        }

        result.textContent = data.analysis;
        statusText.textContent = "● Análisis terminado";
    }
    catch (error) {
        result.textContent = "Error: " + error.message;
        statusText.textContent = "● Error";
    }
    finally {
        analyzeButton.disabled = false;
    }
});
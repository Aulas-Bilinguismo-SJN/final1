const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxRYP6RR1fsu0kHbGmmEuqlq1UKyOwsN8rJEkJp37dkP1BnHNTT7dXGphE_Y4QYEIdC5g/exec';

// URL fija de BaseA
const BASE_A_URL = 'https://docs.google.com/spreadsheets/d/1GU1oKIb9E0Vvwye6zRB2F_fT2jGzRvJ0WoLtWKuio-E/edit?resourcekey=&gid=1744634045#gid=1744634045';
const BASE_A_ID = '1GU1oKIb9E0Vvwye6zRB2F_fT2jGzRvJ0WoLtWKuio-E';

// ID de BaseB para sincronización
const BASE_B_ID = '10jyI4AD24nrkaQnpzog7hCYKPRs6n87Y6XwYfqRPg-Q';

let registrosBaseA = [];
let estadoEquipos = {}; // Cache del estado actual de los equipos
let intervaloSincronizacion = null;
let ultimaActualizacion = null;

// === Datos de los 50 items ===
const items = [];
for (let i = 1; i <= 50; i++) {
    items.push({ id: `item_${i}`, nombre: `${i}`, documento: "", profesor: "", materia: "" });
}

async function cargarBaseAAutomaticamente() {
    const statusElement = document.getElementById('sync-status');
    if (statusElement) {
        statusElement.textContent = 'Cargando BaseA...';
        statusElement.style.color = '#007bff';
        statusElement.style.textAlign = 'center';
        statusElement.style.marginBottom = '20px';
    }

    try {
        const res = await fetch(`${BACKEND_URL}?action=obtenerBaseA&id=${BASE_A_ID}`);
        const json = await res.json();
        if (json.success) {
            registrosBaseA = json.data;
            if (statusElement) {
                statusElement.textContent = 'BaseA cargada correctamente ✓';
                statusElement.style.color = '#28a745';
                // Ocultar el mensaje después de 3 segundos
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 3000);
            }
        } else {
            if (statusElement) {
                statusElement.textContent = 'Error al cargar BaseA: ' + json.mensaje;
                statusElement.style.color = '#dc3545';
            }
            console.error("No se pudo cargar BaseA:", json.mensaje);
        }
    } catch (error) {
        if (statusElement) {
            statusElement.textContent = 'Error de red al cargar BaseA';
            statusElement.style.color = '#dc3545';
        }
        console.error("Error al cargar BaseA:", error);
    }
}

// Nueva función para cargar el estado actual de los equipos desde BaseB
async function cargarEstadoEquipos() {
    try {
        const res = await fetch(`${BACKEND_URL}?action=obtenerEstadoEquipos&id=${BASE_B_ID}`);
        const json = await res.json();
        
        if (json.success) {
            const nuevaActualizacion = json.ultimaActualizacion;
            
            // Solo actualizar si hay cambios
            if (ultimaActualizacion !== nuevaActualizacion) {
                ultimaActualizacion = nuevaActualizacion;
                estadoEquipos = json.equipos || {};
                
                // Actualizar los items con el estado desde BaseB
                actualizarItemsDesdeEstado();
                actualizarVista();
                
                console.log('Estado sincronizado:', estadoEquipos);
            }
        }
    } catch (error) {
        console.error("Error al sincronizar estado:", error);
    }
}

// Actualizar los items locales con el estado desde BaseB
function actualizarItemsDesdeEstado() {
    items.forEach(item => {
        const estadoEquipo = estadoEquipos[item.nombre];
        if (estadoEquipo) {
            item.documento = estadoEquipo.documento || "";
            item.profesor = estadoEquipo.profesor || "";
            item.materia = estadoEquipo.materia || "";
        } else {
            // Si no hay estado en BaseB, el equipo está disponible
            item.documento = "";
            item.profesor = "";
            item.materia = "";
        }
    });
}

// Iniciar sincronización automática
function iniciarSincronizacion() {
    // Cargar estado inicial
    cargarEstadoEquipos();
    
    // Sincronizar cada 3 segundos
    intervaloSincronizacion = setInterval(cargarEstadoEquipos, 3000);
}

// Detener sincronización
function detenerSincronizacion() {
    if (intervaloSincronizacion) {
        clearInterval(intervaloSincronizacion);
        intervaloSincronizacion = null;
    }
}

function buscarPorDocumentoLocal(documento) {
    return registrosBaseA.find(r => String(r["Documento"]).trim() === documento.trim());
}

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (registrosBaseA.length === 0) {
        alert("BaseA aún no se ha cargado. Por favor espere un momento e intente nuevamente.");
        return;
    }

    if (item.documento.trim() !== "") {
        mostrarModalDesmarcar(itemId);
        return;
    }

    const modal = document.getElementById('modalMetodos');
    const listaMetodos = document.getElementById('listaMetodos');
    document.querySelector('.modal-header h2').textContent = `Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Complete la información del Equipo:';
    listaMetodos.innerHTML = '';

    const formulario = document.createElement('div');
    formulario.style.display = 'flex';
    formulario.style.flexDirection = 'column';
    formulario.style.gap = '15px';

    const divDocumento = document.createElement('div');
    divDocumento.innerHTML = `
        <label for="documento">Documento:</label>
        <textarea id="documento" rows="2" placeholder="Ingrese el documento...">${item.documento}</textarea>
    `;

    const divProfesor = document.createElement('div');
    divProfesor.innerHTML = `
        <label for="profesor">Profesor(a) Encargado:</label>
        <input type="text" id="profesor" value="${item.profesor}">
    `;

    const divMateria = document.createElement('div');
    divMateria.innerHTML = `
        <label for="materia">Materia:</label>
        <input type="text" id="materia" value="${item.materia || ''}">
    `;

    const divBotones = document.createElement('div');
    divBotones.style.display = 'flex';
    divBotones.style.gap = '10px';
    divBotones.style.justifyContent = 'flex-end';

    const btnGuardar = document.createElement('button');
    btnGuardar.textContent = 'Guardar';
    btnGuardar.style.backgroundColor = '#007bff';
    btnGuardar.style.color = 'white';
    btnGuardar.style.border = 'none';
    btnGuardar.style.padding = '8px 16px';
    btnGuardar.style.borderRadius = '4px';
    btnGuardar.style.cursor = 'pointer';

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';
    btnCancelar.style.border = 'none';
    btnCancelar.style.padding = '8px 16px';
    btnCancelar.style.borderRadius = '4px';
    btnCancelar.style.cursor = 'pointer';

    btnGuardar.addEventListener('click', async () => {
        const documento = document.getElementById('documento').value.trim();
        const profesor = document.getElementById('profesor').value.trim();
        const materia = document.getElementById('materia').value.trim();

        if (!documento) {
            alert("Debe ingresar un documento.");
            return;
        }

        const persona = buscarPorDocumentoLocal(documento);
        if (!persona) {
            alert("Documento no encontrado en BaseA.");
            return;
        }

        // Mostrar indicador de guardado
        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;
        btnGuardar.style.backgroundColor = '#6c757d';

        try {
            const payload = {
                action: "registrarOperacion",
                equipo: item.nombre,
                documento: documento,
                profesor: profesor,
                materia: materia,
                tipo: "Préstamo",
                nombre: persona["Nombre Completo"] || "",
                curso: persona["Curso"] || "",
                telefono: persona["Teléfono"] || "",
                comentario: ""
            };

            console.log('Enviando datos:', payload);

            // Función auxiliar para enviar POST con manejo de errores mejorado
            const response = await enviarPeticionPOST(payload);
            console.log('Respuesta recibida:', response);
            
            if (response.success) {
                // Actualizar estado local inmediatamente
                item.documento = documento;
                item.profesor = profesor;
                item.materia = materia;
                
                // Forzar sincronización inmediata
                setTimeout(() => cargarEstadoEquipos(), 500);
                
                cerrarModal();
                actualizarVista();
                
                alert("Préstamo registrado exitosamente");
            } else {
                console.error('Error del servidor:', response);
                alert("Error al guardar: " + (response.mensaje || response.error || "Error desconocido"));
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            alert("Error de conexión al guardar: " + error.message);
        } finally {
            btnGuardar.textContent = 'Guardar';
            btnGuardar.disabled = false;
            btnGuardar.style.backgroundColor = '#007bff';
        }
    });

    btnCancelar.addEventListener('click', cerrarModal);

    divBotones.appendChild(btnGuardar);
    divBotones.appendChild(btnCancelar);

    formulario.appendChild(divDocumento);
    formulario.appendChild(divProfesor);
    formulario.appendChild(divMateria);
    formulario.appendChild(divBotones);

    listaMetodos.appendChild(formulario);
    modal.style.display = 'block';
}

// Función auxiliar para enviar peticiones POST con mejor manejo de errores
async function enviarPeticionPOST(payload) {
    const maxReintentos = 3;
    
    for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
            console.log(`Intento ${intento} de ${maxReintentos}`);
            
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                mode: 'cors',
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error(`Error en intento ${intento}:`, error);
            
            if (intento === maxReintentos) {
                throw new Error(`Falló después de ${maxReintentos} intentos: ${error.message}`);
            }
            
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000 * intento));
        }
    }
}

function mostrarModalDesmarcar(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('modalMetodos');
    const listaMetodos = document.getElementById('listaMetodos');
    document.querySelector('.modal-header h2').textContent = `Devolver Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Información del equipo:';
    listaMetodos.innerHTML = '';

    const formulario = document.createElement('div');
    formulario.style.display = 'flex';
    formulario.style.flexDirection = 'column';
    formulario.style.gap = '15px';

    const info = document.createElement('div');
    info.innerHTML = `
        <p><strong>Documento:</strong> ${item.documento}</p>
        <p><strong>Profesor:</strong> ${item.profesor}</p>
        <p><strong>Materia:</strong> ${item.materia || '-'}</p>
    `;

    const divComentario = document.createElement('div');
    divComentario.innerHTML = `
        <label for="comentario">Comentario (opcional):</label>
        <textarea id="comentario" rows="3" placeholder="Escriba un comentario si lo desea..."></textarea>
    `;

    const divBotones = document.createElement('div');
    divBotones.style.display = 'flex';
    divBotones.style.gap = '10px';
    divBotones.style.justifyContent = 'flex-end';

    const btnDesmarcar = document.createElement('button');
    btnDesmarcar.textContent = 'Devolver';
    btnDesmarcar.style.backgroundColor = '#a94442';
    btnDesmarcar.style.color = 'white';
    btnDesmarcar.style.border = 'none';
    btnDesmarcar.style.padding = '8px 16px';
    btnDesmarcar.style.borderRadius = '4px';
    btnDesmarcar.style.cursor = 'pointer';

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';
    btnCancelar.style.border = 'none';
    btnCancelar.style.padding = '8px 16px';
    btnCancelar.style.borderRadius = '4px';
    btnCancelar.style.cursor = 'pointer';

    btnDesmarcar.addEventListener('click', async () => {
        const comentario = document.getElementById('comentario').value.trim();
        const persona = buscarPorDocumentoLocal(item.documento);

        // Mostrar indicador de procesamiento
        btnDesmarcar.textContent = 'Devolviendo...';
        btnDesmarcar.disabled = true;
        btnDesmarcar.style.backgroundColor = '#6c757d';

        try {
            const payload = {
                action: "registrarOperacion",
                equipo: item.nombre,
                documento: item.documento,
                profesor: item.profesor,
                materia: item.materia || '',
                tipo: "Devolución",
                nombre: persona?.["Nombre Completo"] || "",
                curso: persona?.["Curso"] || "",
                telefono: persona?.["Teléfono"] || "",
                comentario: comentario
            };

            console.log('Enviando datos de devolución:', payload);

            const result = await enviarPeticionPOST(payload);
            console.log('Resultado de devolución:', result);
            
            if (result.success) {
                // Actualizar estado local inmediatamente
                item.documento = "";
                item.profesor = "";
                item.materia = "";
                
                // Forzar sincronización inmediata
                setTimeout(() => cargarEstadoEquipos(), 500);
                
                cerrarModal();
                actualizarVista();
                
                alert("Equipo devuelto exitosamente");
            } else {
                console.error('Error del servidor en devolución:', result);
                alert("Error al devolver: " + (result.mensaje || result.error || "Error desconocido"));
            }
        } catch (error) {
            console.error('Error de conexión en devolución:', error);
            alert("Error de conexión al devolver: " + error.message);
        } finally {
            btnDesmarcar.textContent = 'Devolver';
            btnDesmarcar.disabled = false;
            btnDesmarcar.style.backgroundColor = '#a94442';
        }
    });

    btnCancelar.addEventListener('click', cerrarModal);

    divBotones.appendChild(btnDesmarcar);
    divBotones.appendChild(btnCancelar);

    formulario.appendChild(info);
    formulario.appendChild(divComentario);
    formulario.appendChild(divBotones);

    listaMetodos.appendChild(formulario);
    modal.style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalMetodos').style.display = 'none';
}

function actualizarVista() {
    crearGrilla();
    mostrarIndicadorSincronizacion();
}

// Nueva función para mostrar indicador de sincronización
function mostrarIndicadorSincronizacion() {
    let indicador = document.getElementById('indicador-sync');
    if (!indicador) {
        indicador = document.createElement('div');
        indicador.id = 'indicador-sync';
        indicador.style.position = 'fixed';
        indicador.style.top = '10px';
        indicador.style.right = '10px';
        indicador.style.backgroundColor = '#28a745';
        indicador.style.color = 'white';
        indicador.style.padding = '5px 10px';
        indicador.style.borderRadius = '4px';
        indicador.style.fontSize = '12px';
        indicador.style.zIndex = '9999';
        document.body.appendChild(indicador);
    }
    
    indicador.textContent = '● Sincronizado';
    
    // Cambiar color temporalmente al sincronizar
    indicador.style.backgroundColor = '#007bff';
    setTimeout(() => {
        indicador.style.backgroundColor = '#28a745';
    }, 1000);
}

function crearGrilla() {
    const contenedor = document.getElementById("malla") || document.getElementById("contenedorEquipos");
    contenedor.innerHTML = "";
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "repeat(10, 1fr)";
    contenedor.style.gap = "15px";
    contenedor.style.padding = "20px";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "ramo";
        div.style.backgroundColor = item.documento ? "#d4edda" : "#f8f9fa";
        div.style.border = item.documento ? "2px solid #28a745" : "2px solid #ccc";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.cursor = "pointer";
        div.style.borderRadius = "8px";
        div.style.padding = "10px";
        div.style.transition = "all 0.3s ease";

        // Efecto hover
        div.addEventListener('mouseenter', () => {
            div.style.transform = 'scale(1.05)';
            div.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        
        div.addEventListener('mouseleave', () => {
            div.style.transform = 'scale(1)';
            div.style.boxShadow = 'none';
        });

        const numero = document.createElement("div");
        numero.textContent = item.nombre;
        numero.style.fontWeight = "bold";
        numero.style.fontSize = "18px";

        const estado = document.createElement("div");
        estado.textContent = item.documento ? "✓" : "○";
        estado.style.color = item.documento ? "green" : "#6c757d";
        estado.style.fontSize = "16px";
        estado.style.marginTop = "5px";

        div.appendChild(numero);
        div.appendChild(estado);
        div.addEventListener("click", () => mostrarModalItem(item.id));
        contenedor.appendChild(div);
    });
}

function resetearMalla() {
    if (confirm("¿Deseas resetear todos los Equipos?")) {
        items.forEach(item => {
            item.documento = "";
            item.profesor = "";
            item.materia = "";
        });
        actualizarVista();
    }
}

// Detectar cuando la pestaña se vuelve visible/invisible para optimizar sincronización
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Cuando la pestaña se vuelve visible, sincronizar inmediatamente
        cargarEstadoEquipos();
        if (!intervaloSincronizacion) {
            iniciarSincronizacion();
        }
    } else {
        // Cuando la pestaña está oculta, reducir frecuencia o pausar
        // (opcional: podrías reducir la frecuencia en lugar de pausar completamente)
    }
});

// Cerrar modal al hacer clic fuera de él
window.onclick = function (event) {
    const modal = document.getElementById('modalMetodos');
    if (event.target === modal) cerrarModal();
}

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') cerrarModal();
});

// Limpiar intervalos al cerrar/recargar la página
window.addEventListener('beforeunload', function() {
    detenerSincronizacion();
});

// Inicialización automática al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    crearGrilla();
    cargarBaseAAutomaticamente();
    
    // Iniciar sincronización después de un pequeño delay
    setTimeout(() => {
        iniciarSincronizacion();
    }, 2000);
});

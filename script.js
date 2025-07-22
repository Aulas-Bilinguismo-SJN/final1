const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz04cSszrDBdYAo6A9OpoUrKugs8emUXl9WspKnGQPdcHWBTBDNXrBxmwMEJh17duorBg/exec';

// URLs de las bases de datos
const BASE_A_URL = 'https://docs.google.com/spreadsheets/d/1GU1oKIb9E0Vvwye6zRB2F_fT2jGzRvJ0WoLtWKuio-E/edit?resourcekey=&gid=1744634045#gid=1744634045';
const BASE_A_ID = '1GU1oKIb9E0Vvwye6zRB2F_fT2jGzRvJ0WoLtWKuio-E';
const BASE_B_ID = '10jyI4AD24nrkaQnpzog7hCYKPRs6n87Y6XwYfqRPg-Q'; // ID de BaseB

let registrosBaseA = [];
let ultimaActualizacion = 0;
let intervalSync = null;

// === FUNCIONES DE SINCRONIZACIÓN ===
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
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 3000);
            }
            // Cargar estado actual de los equipos después de cargar BaseA
            await cargarEstadoEquipos();
            actualizarVista();
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

// Cargar el estado actual de los equipos desde BaseB
async function cargarEstadoEquipos() {
    try {
        const res = await fetch(`${BACKEND_URL}?action=obtenerEstadoEquipos&id=${BASE_B_ID}`);
        const json = await res.json();
        
        if (json.success && json.data) {
            // Actualizar el estado de los equipos basado en los datos de BaseB
            items.forEach(item => {
                const equipo = json.data.find(e => e.Equipo === item.nombre);
                if (equipo && equipo.Estado === 'Prestado') {
                    item.documento = equipo.Documento || '';
                    item.profesor = equipo.Profesor || '';
                    item.materia = equipo.Materia || '';
                } else {
                    // Si no está en BaseB o está devuelto, limpiar
                    item.documento = '';
                    item.profesor = '';
                    item.materia = '';
                }
            });
            
            ultimaActualizacion = Date.now();
            actualizarVista();
        }
    } catch (error) {
        console.error("Error al cargar estado de equipos:", error);
    }
}

// Sincronización periódica cada 10 segundos
async function sincronizarConServidor() {
    try {
        const res = await fetch(`${BACKEND_URL}?action=verificarCambios&timestamp=${ultimaActualizacion}&id=${BASE_B_ID}`);
        const json = await res.json();
        
        if (json.success && json.hayActualizaciones) {
            await cargarEstadoEquipos();
            mostrarNotificacion('Estados actualizados automáticamente', 'info');
        }
    } catch (error) {
        console.error("Error en sincronización:", error);
    }
}

// Iniciar sincronización automática
function iniciarSincronizacion() {
    if (intervalSync) clearInterval(intervalSync);
    intervalSync = setInterval(sincronizarConServidor, 10000); // Cada 10 segundos
}

// Detener sincronización
function detenerSincronizacion() {
    if (intervalSync) {
        clearInterval(intervalSync);
        intervalSync = null;
    }
}

// === FUNCIONES PRINCIPALES ===
function buscarPorDocumentoLocal(documento) {
    return registrosBaseA.find(r => String(r["Documento"]).trim() === documento.trim());
}

// Datos de los 50 items
const items = [];
for (let i = 1; i <= 50; i++) {
    items.push({ id: `item_${i}`, nombre: `${i}`, documento: "", profesor: "", materia: "" });
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

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';

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

        // Mostrar indicador de carga
        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: "registrarOperacion",
                    equipo: item.nombre,
                    documento,
                    profesor,
                    materia,
                    tipo: "Préstamo",
                    nombre: persona["Nombre Completo"] || "",
                    curso: persona["Curso"] || "",
                    telefono: persona["Teléfono"] || "",
                    comentario: "",
                    baseB_id: BASE_B_ID // Asegurar que se guarde en BaseB
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Actualizar estado local
                item.documento = documento;
                item.profesor = profesor;
                item.materia = materia;
                
                ultimaActualizacion = Date.now();
                mostrarNotificacion(`Equipo ${item.nombre} prestado correctamente`, 'success');
                
                cerrarModal();
                actualizarVista();
                
                // Forzar sincronización inmediata
                setTimeout(() => cargarEstadoEquipos(), 1000);
            } else {
                throw new Error(result.mensaje || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar el préstamo. Intente nuevamente.');
            btnGuardar.textContent = 'Guardar';
            btnGuardar.disabled = false;
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

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';

    btnDesmarcar.addEventListener('click', async () => {
        const comentario = document.getElementById('comentario').value.trim();
        const persona = buscarPorDocumentoLocal(item.documento);

        // Mostrar indicador de carga
        btnDesmarcar.textContent = 'Procesando...';
        btnDesmarcar.disabled = true;

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: "registrarOperacion",
                    equipo: item.nombre,
                    documento: item.documento,
                    profesor: item.profesor,
                    materia: item.materia || '',
                    tipo: "Devolución",
                    nombre: persona?.["Nombre Completo"] || "",
                    curso: persona?.["Curso"] || "",
                    telefono: persona?.["Teléfono"] || "",
                    comentario: comentario,
                    baseB_id: BASE_B_ID // Asegurar que se actualice en BaseB
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Actualizar estado local
                item.documento = "";
                item.profesor = "";
                item.materia = "";
                
                ultimaActualizacion = Date.now();
                mostrarNotificacion(`Equipo ${item.nombre} devuelto correctamente`, 'success');
                
                cerrarModal();
                actualizarVista();
                
                // Forzar sincronización inmediata
                setTimeout(() => cargarEstadoEquipos(), 1000);
            } else {
                throw new Error(result.mensaje || 'Error al procesar devolución');
            }
        } catch (error) {
            console.error('Error al procesar devolución:', error);
            alert('Error al procesar la devolución. Intente nuevamente.');
            btnDesmarcar.textContent = 'Devolver';
            btnDesmarcar.disabled = false;
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

// === FUNCIONES DE UI ===
function cerrarModal() {
    document.getElementById('modalMetodos').style.display = 'none';
}

function actualizarVista() {
    crearGrilla();
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

        const numero = document.createElement("div");
        numero.textContent = item.nombre;
        numero.style.fontWeight = "bold";

        const estado = document.createElement("div");
        estado.textContent = item.documento ? "✓" : "○";
        estado.style.color = item.documento ? "green" : "#6c757d";

        div.appendChild(numero);
        div.appendChild(estado);
        div.addEventListener("click", () => mostrarModalItem(item.id));
        contenedor.appendChild(div);
    });
}

function resetearMalla() {
    if (confirm("¿Deseas resetear todos los Equipos? Esta acción marcará todos los equipos como devueltos.")) {
        items.forEach(async (item, index) => {
            if (item.documento) {
                // Enviar devolución al servidor para cada equipo prestado
                try {
                    await fetch(BACKEND_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action: "registrarOperacion",
                            equipo: item.nombre,
                            documento: item.documento,
                            profesor: item.profesor,
                            materia: item.materia || '',
                            tipo: "Devolución",
                            nombre: "",
                            curso: "",
                            telefono: "",
                            comentario: "Devolución masiva - Reset del sistema",
                            baseB_id: BASE_B_ID
                        })
                    });
                } catch (error) {
                    console.error(`Error al devolver equipo ${item.nombre}:`, error);
                }
            }
            
            // Limpiar estado local
            item.documento = "";
            item.profesor = "";
            item.materia = "";
        });
        
        ultimaActualizacion = Date.now();
        mostrarNotificacion('Todos los equipos han sido devueltos', 'info');
        actualizarVista();
        
        // Forzar sincronización después de un momento
        setTimeout(() => cargarEstadoEquipos(), 2000);
    }
}

// Sistema de notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10001;
        max-width: 300px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    switch(tipo) {
        case 'success':
            notif.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notif.style.backgroundColor = '#dc3545';
            break;
        default:
            notif.style.backgroundColor = '#007bff';
    }
    
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(notif), 300);
    }, 3000);
}

// === EVENT LISTENERS ===
window.onclick = function (event) {
    const modal = document.getElementById('modalMetodos');
    if (event.target === modal) cerrarModal();
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') cerrarModal();
});

// Manejar visibilidad de la página para optimizar sincronización
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        detenerSincronizacion();
    } else {
        iniciarSincronizacion();
        // Sincronizar inmediatamente al volver a la pestaña
        setTimeout(() => cargarEstadoEquipos(), 500);
    }
});

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    crearGrilla();
    await cargarBaseAAutomaticamente();
    iniciarSincronizacion();
    
    // Mostrar estado de sincronización
    const statusDiv = document.getElementById('sync-status');
    if (statusDiv) {
        statusDiv.innerHTML = '<small style="color: #28a745;">🔄 Sincronización automática activa</small>';
    }
});

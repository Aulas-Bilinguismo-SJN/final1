const URL_BACKEND = 'https://script.google.com/macros/s/AKfycbyJKIo4knx0KA3TZF2QWGH7WPG8Q-PUpOHaRoZDq09m4m4ugUtFHs5hSF8gUHpyNRZt5Q/exec';
const idBaseA = '1GU1oKIb9E0Vvwye6zRB2F_fT2jGzRvJ0WoLtWKuio-E';
const idBaseB = '10jyI4AD24nrkaQnpzog7hCYKPRs6n87Y6XwYfqRPg-Q';

let baseA = [];
let estadoEquipos = {};
let equipoSeleccionado = null;

window.onload = () => {
  cargarBaseAAutomaticamente();
  cargarEstadoEquipos();
};

async function cargarBaseAAutomaticamente() {
  const statusElement = document.getElementById('sync-status');
  statusElement.textContent = 'Cargando BaseA...';
  try {
    const response = await fetch(`${URL_BACKEND}?action=obtenerBaseA&id=${idBaseA}`);
    const result = await response.json();
    if (result.success) {
      baseA = result.data;
      statusElement.textContent = 'BaseA cargada correctamente';
      statusElement.style.color = 'green';
      crearMalla();
    } else {
      statusElement.textContent = `Error al cargar BaseA: ${result.mensaje}`;
      statusElement.style.color = 'red';
    }
  } catch (error) {
    statusElement.textContent = 'Error de red al cargar BaseA';
    statusElement.style.color = 'red';
    console.error(error);
  }
}

async function cargarEstadoEquipos() {
  try {
    const response = await fetch(`${URL_BACKEND}?action=obtenerEstadoEquipos&id=${idBaseB}`);
    const result = await response.json();
    if (result.success) {
      estadoEquipos = result.equipos;
      crearMalla(); // vuelve a crear la grilla con estado actualizado
    } else {
      console.error("Error al cargar estado equipos:", result.mensaje);
    }
  } catch (error) {
    console.error("Error de red al cargar estado de equipos:", error);
  }
}

function crearMalla() {
  const malla = document.getElementById('malla');
  malla.innerHTML = '';

  for (let i = 1; i <= 40; i++) {
    const casilla = document.createElement('div');
    casilla.classList.add('casilla');

    const numero = i < 10 ? `0${i}` : i.toString();
    const nombreEquipo = `E-${numero}`;
    casilla.textContent = nombreEquipo;

    const btn = document.createElement('button');
    if (estadoEquipos[nombreEquipo]) {
      casilla.classList.add('prestado');
      btn.textContent = 'Devolver';
      btn.onclick = () => abrirModalDevolucion(nombreEquipo);
    } else {
      btn.textContent = 'Prestar';
      btn.onclick = () => abrirModalPrestamo(nombreEquipo);
    }

    casilla.appendChild(btn);
    malla.appendChild(casilla);
  }
}

function abrirModalPrestamo(equipo) {
  equipoSeleccionado = equipo;
  const modal = document.getElementById('modalMetodos');
  const lista = document.getElementById('listaMetodos');
  lista.innerHTML = '';

  const campos = ['Documento', 'Profesor', 'Materia', 'Comentario'];
  campos.forEach(campo => {
    const label = document.createElement('label');
    label.textContent = campo;

    const input = document.createElement(campo === 'Comentario' ? 'textarea' : 'input');
    input.id = `input-${campo}`;
    lista.appendChild(label);
    lista.appendChild(input);
  });

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar Préstamo';
  btnGuardar.onclick = guardarPrestamo;
  lista.appendChild(btnGuardar);

  modal.style.display = 'block';
}

function abrirModalDevolucion(equipo) {
  equipoSeleccionado = equipo;
  const modal = document.getElementById('modalMetodos');
  const lista = document.getElementById('listaMetodos');
  lista.innerHTML = '';

  const label = document.createElement('label');
  label.textContent = 'Documento';
  const input = document.createElement('input');
  input.id = 'input-Documento';
  lista.appendChild(label);
  lista.appendChild(input);

  const comentarioLabel = document.createElement('label');
  comentarioLabel.textContent = 'Comentario';
  const comentario = document.createElement('textarea');
  comentario.id = 'input-Comentario';
  lista.appendChild(comentarioLabel);
  lista.appendChild(comentario);

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar Devolución';
  btnGuardar.onclick = guardarDevolucion;
  lista.appendChild(btnGuardar);

  modal.style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modalMetodos').style.display = 'none';
  equipoSeleccionado = null;
}

async function guardarPrestamo() {
  const documento = document.getElementById('input-Documento').value.trim().replace(/\n/g, '');
  const profesor = document.getElementById('input-Profesor').value.trim();
  const materia = document.getElementById('input-Materia').value.trim();
  const comentario = document.getElementById('input-Comentario').value.trim();

  if (!documento || !profesor || !materia) {
    alert('Todos los campos excepto comentario son obligatorios.');
    return;
  }

  const estudiante = baseA.find(est => est.Documento == documento);
  if (!estudiante) {
    alert('Documento no encontrado en BaseA');
    return;
  }

  const datosOperacion = {
    tipo: 'Préstamo',
    equipo: equipoSeleccionado,
    documento,
    nombre: estudiante.Nombre,
    curso: estudiante.Curso,
    telefono: estudiante.Telefono,
    profesor,
    materia,
    comentario
  };

  try {
    await registrarOperacionConReintentos(datosOperacion);
    cerrarModal();
    cargarEstadoEquipos();
  } catch (error) {
    alert("Error de conexión al guardar: " + error.message);
  }
}

async function guardarDevolucion() {
  const documento = document.getElementById('input-Documento').value.trim().replace(/\n/g, '');
  const comentario = document.getElementById('input-Comentario').value.trim();

  if (!documento) {
    alert('El campo Documento es obligatorio.');
    return;
  }

  const estudiante = baseA.find(est => est.Documento == documento);
  if (!estudiante) {
    alert('Documento no encontrado en BaseA');
    return;
  }

  const datosOperacion = {
    tipo: 'Devolución',
    equipo: equipoSeleccionado,
    documento,
    nombre: estudiante.Nombre,
    curso: estudiante.Curso,
    telefono: estudiante.Telefono,
    profesor: estadoEquipos[equipoSeleccionado]?.profesor || '',
    materia: estadoEquipos[equipoSeleccionado]?.materia || '',
    comentario
  };

  try {
    await registrarOperacionConReintentos(datosOperacion);
    cerrarModal();
    cargarEstadoEquipos();
  } catch (error) {
    alert("Error de conexión al guardar: " + error.message);
  }
}

function resetearMalla() {
  cargarBaseAAutomaticamente();
  cargarEstadoEquipos();
}

async function registrarOperacionConReintentos(data, reintentos = 3) {
  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      const response = await fetch(URL_BACKEND, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const result = await response.json();

      if (result.success) {
        return result;
      } else {
        throw new Error(result.mensaje || 'Error en respuesta del backend');
      }

    } catch (error) {
      console.warn(`Intento ${intento} fallido: ${error.message}`);
      if (intento === reintentos) {
        throw new Error(`Falló después de ${reintentos} intentos: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

const API_URL = "https://69f225e3b15130b973529e63.mockapi.io/v1";

let estudiantes = [];
let cursos = [];
let paginaEst = 1;
let paginaCur = 1;
const POR_PAGINA = 7;

const modalEstudiante = new bootstrap.Modal(document.getElementById("modalEstudiante"));
const modalCurso = new bootstrap.Modal(document.getElementById("modalCurso"));
const toast = new bootstrap.Toast(document.getElementById("appToast"), { delay: 3200 });

document.addEventListener("DOMContentLoaded", () => {
  configurarNavegacion();
  configurarEventos();
  cargarDatos();
});

function configurarNavegacion() {
  document.querySelectorAll(".app-nav .nav-link").forEach(boton => {
    boton.addEventListener("click", () => {
      const seccion = boton.dataset.section;
      document.querySelectorAll(".app-nav .nav-link").forEach(item => item.classList.remove("active"));
      boton.classList.add("active");
      document.querySelectorAll(".app-section").forEach(item => item.classList.add("d-none"));
      document.getElementById(`section-${seccion}`).classList.remove("d-none");
      const titulos = {
        estudiantes: "Gestión de estudiantes",
        cursos: "Gestión de cursos",
        reporte: "Reporte académico"
      };
      document.getElementById("pageTitle").textContent = titulos[seccion];
      document.getElementById("sidebar").classList.remove("open");
      if (seccion === "reporte") generarReporte();
    });
  });

  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

function configurarEventos() {
  document.getElementById("btnNuevoEstudiante").addEventListener("click", abrirNuevoEstudiante);
  document.getElementById("btnNuevoCurso").addEventListener("click", abrirNuevoCurso);
  document.getElementById("formEstudiante").addEventListener("submit", guardarEstudiante);
  document.getElementById("formCurso").addEventListener("submit", guardarCurso);
  document.getElementById("buscarEstudiante").addEventListener("input", () => { paginaEst = 1; pintarEstudiantes(); });
  document.getElementById("buscarCurso").addEventListener("input", () => { paginaCur = 1; pintarCursos(); });
  document.getElementById("prevEst").addEventListener("click", () => { if (paginaEst > 1) { paginaEst--; pintarEstudiantes(); } });
  document.getElementById("nextEst").addEventListener("click", () => { paginaEst++; pintarEstudiantes(); });
  document.getElementById("prevCur").addEventListener("click", () => { if (paginaCur > 1) { paginaCur--; pintarCursos(); } });
  document.getElementById("nextCur").addEventListener("click", () => { paginaCur++; pintarCursos(); });
  document.getElementById("btnActualizarReporte").addEventListener("click", async () => {
    await cargarDatos();
    generarReporte();
  });
}

async function peticion(endpoint, opciones = {}) {
  const respuesta = await fetch(`${API_URL}/${endpoint}`, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) }
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Error ${respuesta.status}: ${detalle || respuesta.statusText}`);
  }
  if (respuesta.status === 204) return null;
  return respuesta.json();
}

async function cargarDatos() {
  try {
    const [listaEstudiantes, listaCursos] = await Promise.all([
      peticion("estudiantes"),
      peticion("cursos")
    ]);
    estudiantes = Array.isArray(listaEstudiantes) ? listaEstudiantes : [];
    cursos = Array.isArray(listaCursos) ? listaCursos : [];
    pintarEstudiantes();
    pintarCursos();
    actualizarEstadisticas();
    cargarSelectCursos();
  } catch (error) {
    console.error(error);
    mostrarNotificacion("Error de conexión", "No fue posible cargar los datos de la API. Revisa tu conexión e inténtalo de nuevo.", true);
    document.getElementById("tablaEstudiantes").innerHTML = `<tr><td colspan="9" class="table-message">No se pudieron cargar los estudiantes.</td></tr>`;
    document.getElementById("tablaCursos").innerHTML = `<tr><td colspan="8" class="table-message">No se pudieron cargar los cursos.</td></tr>`;
  }
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[caracter]);
}

function nombreCurso(idCurso) {
  const curso = cursos.find(item => String(item.id) === String(idCurso));
  return curso ? curso.cnombre : "Sin curso asignado";
}

function pintarEstudiantes() {
  const busqueda = document.getElementById("buscarEstudiante").value.trim().toLowerCase();
  const filtrados = estudiantes.filter(est => [est.nombres, est.apellidos, est.email]
    .some(valor => String(valor ?? "").toLowerCase().includes(busqueda)));
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  if (paginaEst > totalPaginas) paginaEst = totalPaginas;
  const inicio = (paginaEst - 1) * POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);
  const cuerpo = document.getElementById("tablaEstudiantes");

  if (!visibles.length) {
    cuerpo.innerHTML = `<tr><td colspan="9" class="table-message">No hay estudiantes para mostrar.</td></tr>`;
  } else {
    cuerpo.innerHTML = visibles.map(est => `
      <tr>
        <td><span class="id-text">#${escapar(est.id)}</span></td>
        <td><span class="person-name">${escapar(est.nombres)}</span></td>
        <td>${escapar(est.apellidos)}</td>
        <td><span class="email-text">${escapar(est.email)}</span></td>
        <td>${escapar(est.edad)}</td>
        <td>${escapar(est.programa)}</td>
        <td><span class="course-pill">${escapar(nombreCurso(est.idCurso))}</span></td>
        <td>${formatearFecha(est.creado_a)}</td>
        <td><div class="action-group">
          <button class="btn-action edit" title="Editar" onclick="editarEstudiante('${escapar(est.id)}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-action delete" title="Eliminar" onclick="eliminarEstudiante('${escapar(est.id)}')"><i class="bi bi-trash3"></i></button>
        </div></td>
      </tr>`).join("");
  }
  document.getElementById("paginaEst").textContent = `${paginaEst} / ${totalPaginas}`;
  document.getElementById("infoPaginacionEst").textContent = `Mostrando ${visibles.length} de ${filtrados.length} registros`;
  document.getElementById("prevEst").disabled = paginaEst <= 1;
  document.getElementById("nextEst").disabled = paginaEst >= totalPaginas;
}

function pintarCursos() {
  const busqueda = document.getElementById("buscarCurso").value.trim().toLowerCase();
  const filtrados = cursos.filter(cur => [cur.cnombre, cur.codigo, cur.docente]
    .some(valor => String(valor ?? "").toLowerCase().includes(busqueda)));
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  if (paginaCur > totalPaginas) paginaCur = totalPaginas;
  const inicio = (paginaCur - 1) * POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);
  const cuerpo = document.getElementById("tablaCursos");

  if (!visibles.length) {
    cuerpo.innerHTML = `<tr><td colspan="8" class="table-message">No hay cursos para mostrar.</td></tr>`;
  } else {
    cuerpo.innerHTML = visibles.map(cur => {
      const asociados = estudiantes.filter(est => String(est.idCurso) === String(cur.id)).length;
      return `<tr>
        <td><span class="id-text">#${escapar(cur.id)}</span></td>
        <td><span class="person-name">${escapar(cur.cnombre)}</span></td>
        <td><span class="course-pill">${escapar(cur.codigo)}</span></td>
        <td>${escapar(cur.creditos)}</td>
        <td>${escapar(cur.docente)}</td>
        <td>${escapar(cur.descripcion)}</td>
        <td>${asociados}</td>
        <td><div class="action-group">
          <button class="btn-action edit" title="Editar" onclick="editarCurso('${escapar(cur.id)}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-action delete" title="Eliminar" onclick="eliminarCurso('${escapar(cur.id)}')"><i class="bi bi-trash3"></i></button>
        </div></td>
      </tr>`;
    }).join("");
  }
  document.getElementById("paginaCur").textContent = `${paginaCur} / ${totalPaginas}`;
  document.getElementById("infoPaginacionCur").textContent = `Mostrando ${visibles.length} de ${filtrados.length} registros`;
  document.getElementById("prevCur").disabled = paginaCur <= 1;
  document.getElementById("nextCur").disabled = paginaCur >= totalPaginas;
}

function actualizarEstadisticas() {
  document.getElementById("totalEstudiantes").textContent = estudiantes.length;
  document.getElementById("totalCursosEst").textContent = cursos.length;
  document.getElementById("registrosEst").textContent = estudiantes.length;
  document.getElementById("totalCursos").textContent = cursos.length;
  document.getElementById("totalDocentes").textContent = new Set(cursos.map(c => c.docente).filter(Boolean)).size;
  document.getElementById("totalAsociados").textContent = estudiantes.filter(e => cursos.some(c => String(c.id) === String(e.idCurso))).length;
}

function cargarSelectCursos(idSeleccionado = "") {
  const select = document.getElementById("estCurso");
  select.innerHTML = `<option value="">Seleccione un curso</option>` +
    cursos.map(cur => `<option value="${escapar(cur.id)}" ${String(cur.id) === String(idSeleccionado) ? "selected" : ""}>${escapar(cur.cnombre)} (${escapar(cur.codigo)})</option>`).join("");
}

function abrirNuevoEstudiante() {
  if (!cursos.length) {
    Swal.fire("No hay cursos", "Primero debes registrar un curso para poder asociar un estudiante.", "info");
    return;
  }
  document.getElementById("formEstudiante").reset();
  document.getElementById("estudianteId").value = "";
  document.getElementById("tituloModalEstudiante").textContent = "Nuevo estudiante";
  cargarSelectCursos();
  modalEstudiante.show();
}

function editarEstudiante(id) {
  const est = estudiantes.find(item => String(item.id) === String(id));
  if (!est) return;
  document.getElementById("formEstudiante").reset();
  document.getElementById("estudianteId").value = est.id;
  document.getElementById("estNombres").value = est.nombres ?? "";
  document.getElementById("estApellidos").value = est.apellidos ?? "";
  document.getElementById("estEmail").value = est.email ?? "";
  document.getElementById("estEdad").value = est.edad ?? "";
  document.getElementById("estPrograma").value = est.programa ?? "";
  document.getElementById("tituloModalEstudiante").textContent = "Actualizar estudiante";
  cargarSelectCursos(est.idCurso);
  modalEstudiante.show();
}

async function guardarEstudiante(evento) {
  evento.preventDefault();
  const id = document.getElementById("estudianteId").value;
  const edad = Number(document.getElementById("estEdad").value);
  const datos = {
    nombres: document.getElementById("estNombres").value.trim(),
    apellidos: document.getElementById("estApellidos").value.trim(),
    email: document.getElementById("estEmail").value.trim(),
    edad,
    programa: document.getElementById("estPrograma").value.trim(),
    idCurso: document.getElementById("estCurso").value,
    ...(id ? {} : { creado_a: new Date().toISOString() })
  };

  if (!datos.nombres || !datos.apellidos || !datos.email || !datos.programa || !datos.idCurso ||
      !Number.isInteger(edad) || edad < 1 || edad > 120) {
    mostrarNotificacion("Datos no válidos", "Verifica que todos los campos estén completos y que la edad sea un entero válido.", true);
    return;
  }
  if (!cursos.some(c => String(c.id) === String(datos.idCurso))) {
    mostrarNotificacion("Curso no válido", "Selecciona un curso existente.", true);
    return;
  }

  try {
    if (id) {
      await peticion(`estudiantes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(datos) });
      mostrarNotificacion("Estudiante actualizado", "Los cambios se guardaron correctamente.");
    } else {
      await peticion("estudiantes", { method: "POST", body: JSON.stringify(datos) });
      mostrarNotificacion("Estudiante registrado", "El estudiante se creó correctamente.");
    }
    modalEstudiante.hide();
    paginaEst = 1;
    await cargarDatos();
  } catch (error) {
    console.error(error);
    mostrarNotificacion("No se pudo guardar", error.message, true);
  }
}

async function eliminarEstudiante(id) {
  const est = estudiantes.find(item => String(item.id) === String(id));
  if (!est) return;
  const confirmacion = await Swal.fire({
    title: "¿Eliminar estudiante?",
    text: `Se eliminará el registro de ${est.nombres} ${est.apellidos}. Esta acción no se puede deshacer.`,
    icon: "warning", showCancelButton: true, confirmButtonColor: "#dc3545",
    confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar"
  });
  if (!confirmacion.isConfirmed) return;
  try {
    await peticion(`estudiantes/${encodeURIComponent(id)}`, { method: "DELETE" });
    mostrarNotificacion("Estudiante eliminado", "El registro fue eliminado.");
    await cargarDatos();
  } catch (error) {
    console.error(error);
    mostrarNotificacion("No se pudo eliminar", error.message, true);
  }
}

function abrirNuevoCurso() {
  document.getElementById("formCurso").reset();
  document.getElementById("cursoId").value = "";
  document.getElementById("tituloModalCurso").textContent = "Nuevo curso";
  modalCurso.show();
}

function editarCurso(id) {
  const cur = cursos.find(item => String(item.id) === String(id));
  if (!cur) return;
  document.getElementById("formCurso").reset();
  document.getElementById("cursoId").value = cur.id;
  document.getElementById("curNombre").value = cur.cnombre ?? "";
  document.getElementById("curCodigo").value = cur.codigo ?? "";
  document.getElementById("curCreditos").value = cur.creditos ?? "";
  document.getElementById("curDocente").value = cur.docente ?? "";
  document.getElementById("curDescripcion").value = cur.descripcion ?? "";
  document.getElementById("tituloModalCurso").textContent = "Actualizar curso";
  modalCurso.show();
}

async function guardarCurso(evento) {
  evento.preventDefault();
  const id = document.getElementById("cursoId").value;
  const creditos = Number(document.getElementById("curCreditos").value);
  const datos = {
    cnombre: document.getElementById("curNombre").value.trim(),
    codigo: document.getElementById("curCodigo").value.trim().toUpperCase(),
    creditos,
    docente: document.getElementById("curDocente").value.trim(),
    descripcion: document.getElementById("curDescripcion").value.trim()
  };
  if (!datos.cnombre || !datos.codigo || !datos.docente || !datos.descripcion ||
      !Number.isInteger(creditos) || creditos < 1 || creditos > 30) {
    mostrarNotificacion("Datos no válidos", "Completa todos los campos y utiliza un número entero de créditos entre 1 y 30.", true);
    return;
  }

  try {
    if (id) {
      await peticion(`cursos/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(datos) });
      mostrarNotificacion("Curso actualizado", "Los cambios se guardaron correctamente.");
    } else {
      await peticion("cursos", { method: "POST", body: JSON.stringify(datos) });
      mostrarNotificacion("Curso registrado", "El curso se creó correctamente.");
    }
    modalCurso.hide();
    paginaCur = 1;
    await cargarDatos();
  } catch (error) {
    console.error(error);
    mostrarNotificacion("No se pudo guardar", error.message, true);
  }
}

async function eliminarCurso(id) {
  const cur = cursos.find(item => String(item.id) === String(id));
  if (!cur) return;
  const asociados = estudiantes.filter(est => String(est.idCurso) === String(id));
  if (asociados.length > 0) {
    Swal.fire("No se puede eliminar", `El curso "${cur.cnombre}" tiene ${asociados.length} estudiante(s) asociado(s). Primero debes reasignarlos o eliminar sus registros.`, "warning");
    return;
  }
  const confirmacion = await Swal.fire({
    title: "¿Eliminar curso?",
    text: `Se eliminará el curso ${cur.cnombre}.`,
    icon: "warning", showCancelButton: true, confirmButtonColor: "#dc3545",
    confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar"
  });
  if (!confirmacion.isConfirmed) return;
  try {
    await peticion(`cursos/${encodeURIComponent(id)}`, { method: "DELETE" });
    mostrarNotificacion("Curso eliminado", "El curso fue eliminado correctamente.");
    await cargarDatos();
  } catch (error) {
    console.error(error);
    mostrarNotificacion("No se pudo eliminar", error.message, true);
  }
}

function generarReporte() {
  const total = estudiantes.length;
  const edades = estudiantes.map(e => Number(e.edad)).filter(e => Number.isFinite(e) && e > 0);
  const promedioGlobal = edades.length ? edades.reduce((a, b) => a + b, 0) / edades.length : 0;
  document.getElementById("reporteTotalEst").textContent = total;
  document.getElementById("reporteEdadGlobal").textContent = `${promedioGlobal.toFixed(1)} años`;

  const cuerpo = document.getElementById("tablaReporte");
  if (!cursos.length) {
    cuerpo.innerHTML = `<tr><td colspan="5" class="table-message">No hay cursos registrados.</td></tr>`;
    return;
  }
  cuerpo.innerHTML = cursos.map(cur => {
    const inscritos = estudiantes.filter(est => String(est.idCurso) === String(cur.id));
    const edadesCurso = inscritos.map(e => Number(e.edad)).filter(e => Number.isFinite(e) && e > 0);
    const promedio = edadesCurso.length ? (edadesCurso.reduce((a, b) => a + b, 0) / edadesCurso.length).toFixed(1) : "—";
    return `<tr><td><span class="person-name">${escapar(cur.cnombre)}</span></td>
      <td><span class="course-pill">${escapar(cur.codigo)}</span></td>
      <td>${escapar(cur.docente)}</td><td>${inscritos.length}</td><td>${promedio === "—" ? promedio : `${promedio} años`}</td></tr>`;
  }).join("");
}

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? escapar(fecha) : valor.toLocaleDateString("es-CO");
}

function mostrarNotificacion(titulo, mensaje, error = false) {
  document.getElementById("toastTitle").textContent = titulo;
  document.getElementById("toastMessage").textContent = mensaje;
  document.querySelector(".toast-indicator").style.background = error ? "#ef4444" : "#22c55e";
  toast.show();
}
// OBTENER DATOS DEL FORMULARIO

const tipo =
localStorage.getItem("tipo");

const titulo =
localStorage.getItem("titulo");

const estudiante =
localStorage.getItem("estudiante");

const curso =
localStorage.getItem("curso");

const universidad =
localStorage.getItem("universidad");

const fecha =
localStorage.getItem("fecha");

const conclusiones =
localStorage.getItem("conclusiones");

// INSERTAR DATOS EN EL DASHBOARD

document.getElementById("tipoEjercicio")
.innerText = tipo;

document.getElementById("tituloEjercicio")
.innerText = titulo;

document.getElementById("estudiante")
.innerText = estudiante;

document.getElementById("curso")
.innerText = curso;

document.getElementById("universidad")
.innerText = universidad;

document.getElementById("fecha")
.innerText = fecha;

document.getElementById("conclusionesTexto")
.innerText = conclusiones;

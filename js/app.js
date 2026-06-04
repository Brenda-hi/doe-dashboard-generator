function generarDashboard(){

    // OBTENER DATOS

    const tipo =
    document.getElementById("tipo").value;

    const titulo =
    document.getElementById("titulo").value;

    const estudiante =
    document.getElementById("estudiante").value;

    const curso =
    document.getElementById("curso").value;

    const universidad =
    document.getElementById("universidad").value;

    const fecha =
    document.getElementById("fecha").value;

    const conclusiones =
    document.getElementById("conclusiones").value;

    // GUARDAR DATOS

    localStorage.setItem("tipo", tipo);

    localStorage.setItem("titulo", titulo);

    localStorage.setItem("estudiante", estudiante);

    localStorage.setItem("curso", curso);

    localStorage.setItem("universidad", universidad);

    localStorage.setItem("fecha", fecha);

    localStorage.setItem("conclusiones", conclusiones);

    // ABRIR DASHBOARD

    window.location.href = "dashboard.html";
}

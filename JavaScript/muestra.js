document.addEventListener("DOMContentLoaded", () => {
    const botonAceptar = document.getElementById("boton-aceptar");
    const materiaOrganicaInput = document.getElementById("cantidadmuestra");

    let primerClick = true;

    // Función para agregar el label y el input dinámico
    const agregarInputCalidad = () => {
        const valor = parseFloat(materiaOrganicaInput.value);
        let calidad = "";
        let claseColor = "";

        // Determinar la calidad de la materia orgánica y el color asociado
        if (valor >= 75) {
            calidad = "Alta fertilidad";
            claseColor = "calidad-buena";
        } else if (valor >= 50) {
            calidad = "Media fertilidad";
            claseColor = "calidad-regular";
        } else if (valor > 0) {
            calidad = "Baja Fertilidad";
            claseColor = "calidad-mala";
        } else {
            calidad = ""; // Si no hay valor válido
        }

        // Verificar si ya existe el label y el input
        let calidadLabel = document.getElementById("calidad-label");
        let calidadInput = document.getElementById("calidad-materia");

        if (!calidadLabel) {
            // Crear el label dinámico si no existe
            calidadLabel = document.createElement("label");
            calidadLabel.id = "calidad-label";
            calidadLabel.textContent = "Calidad de materia orgánica:";
            calidadLabel.style.marginTop = "10px";
            calidadLabel.style.display = "block";
            botonAceptar.parentElement.insertBefore(calidadLabel, botonAceptar);
        }

        if (!calidadInput) {
            // Crear el input dinámico si no existe
            calidadInput = document.createElement("input");
            calidadInput.id = "calidad-materia";
            calidadInput.type = "text";
            calidadInput.readOnly = true;
            calidadInput.style.marginBottom = "10px";
            calidadInput.className = claseColor; // Asigna la clase CSS según la calidad
            botonAceptar.parentElement.insertBefore(calidadInput, botonAceptar);
        }

        // Actualizar el valor del input y su clase de color
        calidadInput.value = calidad;
        calidadInput.className = claseColor;
    };

    // Evento click del botón
    botonAceptar.addEventListener("click", (event) => {
        event.preventDefault();

        if (primerClick) {
            const form = botonAceptar.closest("form");
            if (form.checkValidity()) {
                agregarInputCalidad();

                // Cambiar el color y texto del botón
                botonAceptar.style.backgroundColor = "green";
                botonAceptar.textContent = "Agregar muestra";

                primerClick = false;
            } else {
                form.reportValidity();
            }
        } else {
            window.location.href = "pagusuario.html";
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const botonAceptar = document.getElementById("boton-aceptar");
    const materiaOrganicaInput = document.getElementById("cantidadmuestra");

    let primerClick = true;

    // Función para obtener parámetros de la URL
    const obtenerParametroURL = (parametro) => {
        const params = new URLSearchParams(window.location.search);
        return params.get(parametro);
    };

    // Obtener el ID de la parcela desde la URL
    const parcelaId = obtenerParametroURL("parcelaId");

    // Función para obtener el próximo ID de muestra
    const obtenerProximoIdMuestra = async () => {
        try {
            const response = await fetch("/api/proximoIdMuestra");
            if (response.ok) {
                const data = await response.json();
                return data.nuevoId;
            } else {
                throw new Error("No se pudo obtener el próximo ID de muestra.");
            }
        } catch (error) {
            console.error("Error al obtener el próximo ID:", error);
            return null;
        }
    };

    const determinarCalidadYFertilidad = async () => {
        const valor = parseFloat(materiaOrganicaInput.value);
        let calidad = "";
        let descripcion = "";
        let claseColor = "";
        let fertilidadId = null;

        if (valor >= 75) {
            calidad = "Alta fertilidad";
            descripcion = "Alto";
            claseColor = "calidad-buena";
        } else if (valor >= 50) {
            calidad = "Media fertilidad";
            descripcion = "Medio";
            claseColor = "calidad-regular";
        } else if (valor > 0) {
            calidad = "Baja Fertilidad";
            descripcion = "Bajo";
            claseColor = "calidad-mala";
        }

        try {
            const response = await fetch(`/api/obtenerFertilidad?descripcion=${encodeURIComponent(descripcion)}`);
            if (response.ok) {
                const data = await response.json();
                fertilidadId = data.id; // Suponiendo que el backend devuelve el `FER_ID`
            } else {
                throw new Error("No se encontró el tipo de fertilidad.");
            }
        } catch (error) {
            console.error("Error al obtener fertilidad:", error);
        }

        console.log("Fertilidad calculada:", { calidad, descripcion, fertilidadId }); // Validar en la consola
        return { calidad, descripcion, claseColor, fertilidadId };
    };


    // Función para agregar dinámicamente los inputs de calidad y descripción (sin ID visible)
    const agregarInputsDinamicos = ({ calidad, descripcion, claseColor }) => {
        // Calidad de materia orgánica
        let calidadLabel = document.getElementById("calidad-label");
        let calidadInput = document.getElementById("calidad-materia");

        if (!calidadLabel) {
            calidadLabel = document.createElement("label");
            calidadLabel.id = "calidad-label";
            calidadLabel.textContent = "Calidad de materia orgánica:";
            calidadLabel.style.marginTop = "10px";
            calidadLabel.style.display = "block";
            botonAceptar.parentElement.insertBefore(calidadLabel, botonAceptar);
        }

        if (!calidadInput) {
            calidadInput = document.createElement("input");
            calidadInput.id = "calidad-materia";
            calidadInput.type = "text";
            calidadInput.readOnly = true;
            calidadInput.style.marginBottom = "10px";
            calidadInput.className = claseColor;
            botonAceptar.parentElement.insertBefore(calidadInput, botonAceptar);
        }

        calidadInput.value = calidad;

        // Descripción de fertilidad
        let descripcionLabel = document.getElementById("descripcion-label");
        let descripcionInput = document.getElementById("descripcion-fertilidad");

        if (!descripcionLabel) {
            descripcionLabel = document.createElement("label");
            descripcionLabel.id = "descripcion-label";
            descripcionLabel.textContent = "Descripción de fertilidad:";
            descripcionLabel.style.marginTop = "10px";
            descripcionLabel.style.display = "block";
            botonAceptar.parentElement.insertBefore(descripcionLabel, botonAceptar);
        }

        if (!descripcionInput) {
            descripcionInput = document.createElement("input");
            descripcionInput.id = "descripcion-fertilidad";
            descripcionInput.type = "text";
            descripcionInput.readOnly = true;
            descripcionInput.style.marginBottom = "10px";
            botonAceptar.parentElement.insertBefore(descripcionInput, botonAceptar);
        }

        descripcionInput.value = descripcion;
    };

    // Función para registrar la muestra en la base de datos
    const registrarMuestra = async (muestra) => {
        try {
            const response = await fetch("/api/guardarMuestra", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(muestra),
            });

            if (response.ok) {
                alert("Muestra guardada correctamente.");
                window.location.href = "/organismos.html";
            } else {
                alert("Error al guardar la muestra.");
            }
        } catch (error) {
            console.error("Error al guardar la muestra:", error);
            alert("Hubo un problema al conectar con el servidor.");
        }
    };

    let globalFertilidadId = null; // Variable global para almacenar el ID de fertilidad

    botonAceptar.addEventListener("click", async (event) => {
        event.preventDefault();

        if (primerClick) {
            const form = botonAceptar.closest("form");
            if (form.checkValidity()) {
                const { calidad, descripcion, claseColor, fertilidadId } = await determinarCalidadYFertilidad();

                if (!fertilidadId) {
                    console.error("Error: Fertilidad ID no encontrado.");
                    alert("No se pudo determinar el tipo de fertilidad. Por favor, revise los datos.");
                    return;
                }

                globalFertilidadId = fertilidadId; // Guardamos el ID de fertilidad globalmente
                agregarInputsDinamicos({ calidad, descripcion, claseColor });

                botonAceptar.style.backgroundColor = "green";
                botonAceptar.textContent = "Guardar muestra";

                primerClick = false;
            } else {
                console.log("Formulario no válido.");
                form.reportValidity();
            }
        } else {
            const ubicacion = document.querySelector("input[type='text']").value;
            const fecha = document.getElementById("fecha").value;
            const cantidadMuestra = materiaOrganicaInput.value;
            const calidad = document.getElementById("calidad-materia").value;
            const muId = await obtenerProximoIdMuestra();

            if (!muId) {
                console.error("Error: No se pudo generar el ID de la muestra.");
                alert("No se pudo generar el ID de la muestra.");
                return;
            }

            if (!globalFertilidadId) {
                console.error("Error: Fertilidad ID no está disponible.");
                alert("Fertilidad ID no encontrado. Por favor, intente nuevamente.");
                return;
            }

            const nuevaMuestra = {
                muId,
                parcelaId,
                ubicacion,
                fecha,
                cantidadMuestra,
                calidad,
                fertilidadId: globalFertilidadId, // Usamos la variable global
            };

            console.log("Datos enviados al servidor:", nuevaMuestra);

            await registrarMuestra(nuevaMuestra);
        }
    });


});

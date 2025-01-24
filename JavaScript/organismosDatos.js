document.addEventListener("DOMContentLoaded", async () => {
    const tiposSelect = document.getElementById("tipos");
    const organismosSelect = document.getElementById("organismo");

    // Función para obtener parámetros de la URL
    const obtenerParametroURL = (parametro) => {
        const params = new URLSearchParams(window.location.search);
        return params.get(parametro);
    };

    // Obtener el ID de la muestra desde la URL
    const muestraId = obtenerParametroURL("muestraId");

    if (!muestraId) {
        console.error("No se encontró el ID de la muestra en la URL.");
        alert("Error: No se encontró el ID de la muestra. No se puede continuar.");
        return;
    }

    console.log("MU_ID recibido:", muestraId); // Validar que se recibe correctamente

    // Cargar tipos de organismos
    try {
        const respuesta = await fetch("/tipoorganismo");
        if (!respuesta.ok) throw new Error("Error al obtener tipos de organismos");

        const tipos = await respuesta.json();

        tipos.forEach((item) => {
            const opcion = document.createElement("option");
            opcion.value = item.to_id; // ID del tipo de organismo
            opcion.textContent = item.to_nombre; // Nombre del tipo de organismo
            tiposSelect.appendChild(opcion);
        });
    } catch (error) {
        console.error("Error al cargar los tipos de organismos:", error);
    }

    // Cargar organismos según el tipo seleccionado
    tiposSelect.addEventListener("change", async () => {
        const to_id = tiposSelect.value; // ID seleccionado en el primer select
        organismosSelect.innerHTML = '<option value="">Selecciona un organismo</option>'; // Limpia el segundo select

        if (!to_id) return; // Si no hay selección, no hacer nada

        try {
            const respuesta = await fetch(`/listaorganismos/${to_id}`);
            if (!respuesta.ok) throw new Error("Error al obtener organismos");

            const organismos = await respuesta.json();

            organismos.forEach((org) => {
                const opcion = document.createElement("option");
                opcion.value = org.or_id; // ID del organismo
                opcion.textContent = org.or_nombre; // Nombre del organismo
                organismosSelect.appendChild(opcion);
            });
        } catch (error) {
            console.error("Error al cargar los organismos:", error);
        }
    });



    // Lógica para guardar el organismo seleccionado asociado a la muestra
    const botonAceptar = document.querySelector("#botonAceptar"); 

    botonAceptar.addEventListener("click", async (event) => {
        event.preventDefault(); // Evitar el envío por defecto del formulario
    
        const organismoSeleccionado = organismosSelect.value;
    
        if (!organismoSeleccionado) {
            alert("Por favor selecciona un organismo antes de continuar.");
            return;
        }
    
        // Crear el detalle de muestra con datos necesarios
        const detalleMuestra = {
            orId: organismoSeleccionado,
            muId: muestraId, // Asociar con la muestra
        };
    
        console.log("Detalle de muestra a guardar:", detalleMuestra);
    
        try {
            const respuesta = await fetch("/api/guardarDetalleMuestra", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(detalleMuestra),
            });
    
            if (respuesta.ok) {
                const data = await respuesta.json();
                alert(`Detalle de muestra guardado correctamente con ID: ${data.dmId}`);
                // Redirigir o realizar alguna acción adicional
            } else {
                alert("Error al guardar el detalle de muestra.");
            }
        } catch (error) {
            console.error("Error al guardar el detalle de muestra:", error);
            alert("Hubo un problema al conectar con el servidor.");
        }
    });
    
    
});

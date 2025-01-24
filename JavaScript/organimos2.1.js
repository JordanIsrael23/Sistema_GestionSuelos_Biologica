document.addEventListener("DOMContentLoaded", async () => {
    const tiposSelect = document.getElementById("tipos");
    const ordenesSelect = document.getElementById("ordenes");
    const nombreInput = document.getElementById("nombre");
    const botonAceptar = document.querySelector("button[type='submit']");

    // Cargar tipos de organismos
    try {
        const respuesta = await fetch("/tiposOrganismos");
        if (!respuesta.ok) throw new Error("Error al obtener tipos de organismos");

        const tipos = await respuesta.json();
        tipos.forEach((item) => {
            const opcion = document.createElement("option");
            opcion.value = item.to_id; // ID del tipo de organismo
            opcion.textContent = item.to_nombre; // Nombre del tipo de organismo
            tiposSelect.appendChild(opcion);
        });
    } catch (error) {
        console.error("Error al cargar tipos de organismos:", error);
    }

    // Cargar órdenes
    try {
        const respuesta = await fetch("/ordenes");
        if (!respuesta.ok) throw new Error("Error al obtener órdenes");

        const ordenes = await respuesta.json();
        ordenes.forEach((item) => {
            const opcion = document.createElement("option");
            opcion.value = item.tor_id; // ID del orden
            opcion.textContent = item.tor_nombres; // Nombre del orden
            ordenesSelect.appendChild(opcion);
        });
    } catch (error) {
        console.error("Error al cargar órdenes:", error);
    }

    botonAceptar.addEventListener("click", async (event) => {
        event.preventDefault(); // Evitar envío por defecto
    
        const toId = tiposSelect.value;
        const torId = ordenesSelect.value;
        const orNombre = nombreInput.value;
    
        if (!toId || !torId || !orNombre.trim()) {
            alert("Por favor, completa todos los campos antes de continuar.");
            return;
        }
    
        try {
            // Obtener el próximo ID de organismo
            const idRespuesta = await fetch("/proximoIdOrganismo");
            if (!idRespuesta.ok) throw new Error("Error al obtener el próximo ID de organismo");
    
            const { nuevoId: orId } = await idRespuesta.json();
    
            // Datos a enviar
            const nuevoOrganismo = { orId, toId, torId, orNombre };
    
            // Guardar en la base de datos
            const respuesta = await fetch("/guardarOrganismo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoOrganismo),
            });
    
            if (respuesta.ok) {
                alert("Organismo guardado correctamente.");
                // Limpiar el formulario
                nombreInput.value = "";
                tiposSelect.selectedIndex = 0;
                ordenesSelect.selectedIndex = 0;
            } else {
                alert("Error al guardar el organismo.");
            }
        } catch (error) {
            console.error("Error al guardar el organismo:", error);
            alert("Error al guardar el organismo: " + error.message);
        }
    });
    
});

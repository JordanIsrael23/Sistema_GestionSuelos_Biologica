document.addEventListener('DOMContentLoaded', async () => {
    const seleccion = document.getElementById('plantas'); // Asegúrate de que el ID del select sea correcto

    try {
        // Realiza la solicitud al backend
        const respuesta = await fetch('/listaplantas');
        if (!respuesta.ok) throw new Error('Error al obtener datos del servidor');

        const datos = await respuesta.json(); // Convierte la respuesta en JSON

        // Itera sobre los datos y agrega opciones al <select>
        datos.forEach(item => {
            const opcion = document.createElement('option');
            opcion.value = item.pl_id; // Usa el ID como valor de la opción
            opcion.textContent = item.pl_nombre; // Usa el nombre como texto visible
            seleccion.appendChild(opcion);
        });
    } catch (error) {
        console.error('Error al cargar las opciones:', error);
    }
});

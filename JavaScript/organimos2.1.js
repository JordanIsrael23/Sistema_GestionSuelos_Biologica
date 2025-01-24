document.addEventListener('DOMContentLoaded', async () => {
    const seleccion = document.getElementById('ordenes'); // Asegúrate de que el ID del select sea correcto

    try {
        // Realiza la solicitud al backend
        const respuesta = await fetch('/orden');
        if (!respuesta.ok) throw new Error('Error al obtener datos del servidor');

        const tipos = await respuesta.json(); // Convierte la respuesta en JSON

        // Itera sobre los datos y agrega opciones al <select>
        tipos.forEach(item => {
            const opcion = document.createElement('option');
            opcion.value = item.tor_id; // Usa el ID como valor de la opción
            opcion.textContent = item.tor_nombres; // Usa el nombre como texto visible
            seleccion.appendChild(opcion);
        });
    } catch (error) {
        console.error('Error al cargar las opciones:', error);
    }
});

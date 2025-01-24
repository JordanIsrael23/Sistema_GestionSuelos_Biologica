document.addEventListener('DOMContentLoaded', async () => {
    const tiposelect = document.getElementById('tipos');
    const seleccion = document.getElementById('organismo'); // Asegúrate de que el ID del select sea correcto

    tiposSelect.addEventListener('change', async () => {
        const to_id = tiposSelect.value; // ID seleccionado en el primer select
        organismosSelect.innerHTML = '<option value="">Selecciona un organismo</option>'; // Limpia el segundo select

        if (!to_id) return; // Si no hay selección, no hacer nada

        try {
            const respuesta = await fetch(`/listaorganismos/${to_id}`);
            if (!respuesta.ok) throw new Error('Error al obtener organismos');

            const organismos = await respuesta.json();

            organismos.forEach(org => {
                const opcion = document.createElement('option');
                opcion.value = org.or_id; // ID del organismo
                opcion.textContent = org.or_nombre; // Nombre del organismo
                organismosSelect.appendChild(opcion);
            });
        } catch (error) {
            console.error('Error al cargar los organismos:', error);
        }
    });
});

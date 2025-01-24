document.addEventListener('DOMContentLoaded', async () => {
    const tiposelecion = document.getElementById('tipos');
    const seleccion = document.getElementById('organismos'); // Asegúrate de que el ID del select sea correcto

    try {
        // Realiza la solicitud al backend
        const respuesta = await fetch('/tipoorganismo');
        if (!respuesta.ok) throw new Error('Error al obtener datos del servidor');

        const datos = await respuesta.json(); // Convierte la respuesta en JSON

        // Itera sobre los datos y agrega opciones al <select>
        datos.forEach(item => {
            const opcion = document.createElement('option');
            opcion.value = item.to_id; // Usa el ID como valor de la opción
            opcion.textContent = item.to_nombre; // Usa el nombre como texto visible
            seleccion.appendChild(opcion);
        });
    } catch (error) {
        console.error('Error al cargar las opciones:', error);
    }

    tiposelecion.addEventListener('change',async ()=>{
        const to_id = tiposelecion.value;
        seleccion.innerHTML = '<option>Selecciona un organismo</option>';


        if(!to_id) return;

        try{
            const resultado = await fetch('/organismos/${to_id}');
            if(!resultado.ok) throw new Error('Error al obtner datos');

            const organismos = await resultado.json();

            organismos.forEach(org=>{
                const opcion = document.createElement('option');
                opcion.value = org.or_id;
                opcion.textContent = org.or_nombre;
                seleccion.appendChild(opcion);
            });
        }catch(error){
            console.error('Error',error);
        }
    });
});

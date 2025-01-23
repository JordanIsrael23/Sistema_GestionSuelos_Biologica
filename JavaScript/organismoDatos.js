document.addEventListener('DOMContentLoaded',async ()=> {
    const seleccion = document.getElementById('tipos');

    try{
        const respuesta = await fetch('/tipoorganismo');
        if(!respuesta.ok) throw new Error('Error a; ontener datos');

        const datos = await respuesta.json();

        datos.forEach(item =>{
            const opcion = document.createElement('option');
            opcion.value = item.id;
            opcion.textContent = item.nombre;
            seleccion.appendChild(opcion);
        });

    }catch(error){
        console.error('Error al cargar opciones');
    }
});
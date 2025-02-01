document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/listarparcelas');
        if (!response.ok) throw new Error('Error al obtener las parcelas');

        const parcelas = await response.json();
        const tabla = document.getElementById('tablaParcelas');

        parcelas.forEach(parcela => {
            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${parcela.id}</td>
                <td>${parcela.nombre}</td>
                <td>${parcela.latitud.toFixed(6)}</td>
                <td>${parcela.longitud.toFixed(6)}</td>
                <td>${parcela.area.toFixed(2)} m²</td>
                <td>
                    <button class="edit-button" data-id="${parcela.id}">Modificar</button>
                    <button class="delete-button" data-id="${parcela.id}">Eliminar</button>
                </td>
            `;

            tabla.appendChild(fila);
        });

        // Agregar eventos a los botones de Modificar y Eliminar
        document.querySelectorAll('.edit-button').forEach(boton => {
            boton.addEventListener('click', (e) => {
                const parcelaId = e.target.getAttribute('data-id');
                window.location.href = `/actualizarParcelas.html?parcelaId=${parcelaId}`;
            });
        });

        document.querySelectorAll('.delete-button').forEach(boton => {
            boton.addEventListener('click', async (e) => {
                const parcelaId = e.target.getAttribute('data-id');
                const confirmacion = confirm('¿Estás seguro de eliminar esta parcela?');

                if (confirmacion) {
                    try {
                        const response = await fetch(`/eliminarparcela/${parcelaId}`, { method: 'DELETE' });
                        if (response.ok) {
                            alert('Parcela eliminada con éxito');
                            location.reload();
                        } else {
                            alert('Error al eliminar la parcela.');
                        }
                    } catch (error) {
                        console.error('Error al eliminar la parcela.', error);
                    }
                }
            });
        });

    } catch (error) {
        console.error('Error al cargar las parcelas:', error);
        alert('Hubo un error al conectar con el servidor.');
    }
});

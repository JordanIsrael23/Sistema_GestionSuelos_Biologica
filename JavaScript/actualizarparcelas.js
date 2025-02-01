document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const parcelaId = urlParams.get('parcelaId');

    if (!parcelaId) {
        alert('No se encontró la parcela.');
        window.location.href = '/listaparcela.html';
        return;
    }

    try {
        // Cargar datos de la parcela
        const response = await fetch(`/obtenerparcela/${parcelaId}`);
        if (!response.ok) throw new Error('Error al obtener los datos de la parcela.');

        const parcela = await response.json();

        // Asegurar que los datos se asignen correctamente
        document.getElementById('parc_nombre').value = parcela.parc_nombre || '';
        document.getElementById('parc_area').value = parcela.parc_area || 0;
        document.getElementById('parc_coord_la').value = parcela.parc_coord_la || 0;
        document.getElementById('parc_coord_lo').value = parcela.parc_coord_lo || 0;
        document.getElementById('parc_descripcion').value = parcela.parc_descripcion || '';

    } catch (error) {
        console.error('Error al cargar los datos:', error);
        alert('No se pudo cargar la información.');
    }

    // Guardar cambios
    document.getElementById('formActualizarParcela').addEventListener('submit', async (event) => {
        event.preventDefault();

        const datos = {
            parc_nombre: document.getElementById('parc_nombre').value,
            parc_area: parseFloat(document.getElementById('parc_area').value),
            parc_coord_la: parseFloat(document.getElementById('parc_coord_la').value),
            parc_coord_lo: parseFloat(document.getElementById('parc_coord_lo').value),
            parc_descripcion: document.getElementById('parc_descripcion').value,
        };

        try {
            const response = await fetch(`/actualizarparcela/${parcelaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });

            if (response.ok) {
                alert('Parcela actualizada correctamente.');
                window.location.href = '/listaparcelas.html';
            } else {
                alert('Error al actualizar la parcela.');
            }
        } catch (error) {
            console.error('Error al actualizar:', error);
        }
    });
});

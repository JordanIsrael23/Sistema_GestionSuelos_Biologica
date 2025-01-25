const express = require("express");
const router = express.Router();
const conexion = require("./database");

// Endpoint para guardar un detalle de muestra
router.post('/guardarDetalleMuestra', async (req, res) => {
    const { orId, muId } = req.body;

    try {
        // Obtener el último DM_ID registrado
        const result = await conexion.query(
            'SELECT DM_ID FROM SM_B_DETALLESMUESTRAS ORDER BY LENGTH(DM_ID) DESC, DM_ID DESC LIMIT 1'
        );

        let nuevoId;
        if (result.rows.length > 0) {
            // Extraer la parte numérica del último ID y generar el siguiente
            const ultimoId = parseInt(result.rows[0].dm_id.slice(2)); // Ignora "DM"
            nuevoId = `DM${(ultimoId + 1).toString().padStart(2, '0')}`;
        } else {
            // Si no hay registros, inicia con DM01
            nuevoId = 'DM01';
        }

        console.log('Generado nuevo ID:', nuevoId);

        // Verificar si el nuevo ID ya existe (en caso de concurrencia)
        const existeId = await conexion.query(
            'SELECT 1 FROM SM_B_DETALLESMUESTRAS WHERE DM_ID = $1',
            [nuevoId]
        );

        if (existeId.rows.length > 0) {
            return res.status(400).json({ error: 'El ID generado ya existe. Intenta nuevamente.' });
        }

        // Insertar el detalle de muestra
        await conexion.query(
            `INSERT INTO SM_B_DETALLESMUESTRAS (DM_ID, OR_ID, MU_ID, DM_CANTIDADORGANISMOS) 
            VALUES ($1, $2, $3, $4)`,
            [nuevoId, orId, muId, 100] // Ajusta el valor de DM_CANTIDADORGANISMOS si es necesario
        );

        res.status(201).json({ success: 'Detalle de muestra guardado correctamente', dmId: nuevoId });
    } catch (error) {
        console.error('Error al guardar el detalle de muestra:', error);
        res.status(500).json({ error: 'Error al guardar el detalle de muestra en la base de datos.' });
    }
});


module.exports = router;

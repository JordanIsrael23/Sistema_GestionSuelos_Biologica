const express = require('express');
const router = express.Router();
const conexion = require('./database');

// Obtener una parcela por ID
router.get('/obtenerparcela/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = 'SELECT * FROM SM_PARCELAS WHERE PARC_ID = $1';
        const result = await conexion.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Parcela no encontrada." });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al obtener parcela:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Actualizar una parcela
router.put('/actualizarparcela/:id', async (req, res) => {
    const { id } = req.params;
    const { parc_nombre, parc_area, parc_coord_la, parc_coord_lo, parc_descripcion } = req.body;

    try {
        const query = `
            UPDATE SM_PARCELAS 
            SET PARC_NOMBRE = $1, PARC_AREA = $2, PARC_COORD_LA = $3, PARC_COORD_LO = $4, PARC_DESCRIPCION = $5
            WHERE PARC_ID = $6
        `;
        const result = await conexion.query(query, [parc_nombre, parc_area, parc_coord_la, parc_coord_lo, parc_descripcion, id]);

        if (result.rowCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Parcela no encontrada." });
        }
    } catch (error) {
        console.error("Error al actualizar parcela:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Eliminar una parcela
router.delete('/eliminarparcela/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = 'DELETE FROM SM_PARCELAS WHERE PARC_ID = $1';
        const result = await conexion.query(query, [id]);
        if (result.rowCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Parcela no encontrada." });
        }
    } catch (error) {
        console.error("Error al eliminar parcela:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

module.exports = router;

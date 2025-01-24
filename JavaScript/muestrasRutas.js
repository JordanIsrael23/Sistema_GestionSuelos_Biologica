const express = require("express");
const router = express.Router();
const conexion = require("./database");

// Endpoint para guardar un detalle de muestra
router.post("/guardarDetalleMuestra", async (req, res) => {
    const { orId, muId } = req.body;

    try {
        // Generar el próximo ID de detalle de muestra
        const result = await conexion.query(
            "SELECT DM_ID FROM SM_B_DETALLESMUESTRAS ORDER BY DM_ID DESC LIMIT 1"
        );

        let nuevoId;
        if (result.rows.length > 0) {
            const ultimoId = parseInt(result.rows[0].dm_id.substring(2)); // Extraer el número ignorando "DM"
            nuevoId = `DM${ultimoId + 1}`;
        } else {
            nuevoId = "DM1"; // Si no hay registros, empezar desde DM1
        }

        // Insertar el detalle de muestra con cantidad estática de 100
        await conexion.query(
            `INSERT INTO SM_B_DETALLESMUESTRAS (DM_ID, OR_ID, MU_ID, DM_CANTIDADORGANISMOS) 
            VALUES ($1, $2, $3, $4)`,
            [nuevoId, orId, muId, 100]
        );

        res.status(201).json({ success: "Detalle de muestra guardado correctamente", dmId: nuevoId });
    } catch (error) {
        console.error("Error al guardar el detalle de muestra:", error);
        res.status(500).json({ error: "Error al guardar el detalle de muestra en la base de datos." });
    }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("./database"); 

// Endpoint para obtener el próximo ID de muestra
router.get("/proximoIdMuestra", async (req, res) => {
    try {
        const result = await db.query("SELECT MU_ID FROM SM_B_MUESTRAS ORDER BY MU_ID DESC LIMIT 1");

        let nuevoId;
        if (result.rows.length > 0) {
            const ultimoId = parseInt(result.rows[0].mu_id.substring(1)); // Extraemos el número ignorando la "M"
            nuevoId = `M${ultimoId + 1}`;
        } else {
            nuevoId = "M1"; // Si no hay registros, empezamos desde M1
        }

        res.json({ nuevoId });
    } catch (error) {
        console.error("Error al obtener el próximo ID de muestra:", error);
        res.status(500).json({ error: "Error del servidor al generar el próximo ID de muestra." });
    }
});

// Endpoint para obtener el ID de fertilidad por descripción
router.get("/obtenerFertilidad", async (req, res) => {
    const descripcion = req.query.descripcion;

    try {
        const result = await db.query(
            "SELECT FER_ID FROM SM_B_FERTILIDADES WHERE FER_DESCRIPCION = $1",
            [descripcion]
        );

        if (result.rows.length > 0) {
            res.json({ id: result.rows[0].fer_id });
        } else {
            res.status(404).json({ error: "Tipo de fertilidad no encontrado." });
        }
    } catch (error) {
        console.error("Error al obtener fertilidad:", error);
        res.status(500).json({ error: "Error del servidor al buscar fertilidad." });
    }
});

module.exports = router;

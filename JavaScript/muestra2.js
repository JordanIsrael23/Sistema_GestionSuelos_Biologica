const express = require("express");
const router = express.Router();
const db = require("./database"); 

router.get("/proximoIdMuestra", async (req, res) => {
    try {
        const result = await db.query("SELECT MAX(CAST(SUBSTRING(MU_ID, 2) AS INTEGER)) AS max_id FROM SM_B_MUESTRAS");

        let nuevoId;
        if (result.rows[0].max_id !== null) {
            const maxId = result.rows[0].max_id; // Número más alto encontrado
            nuevoId = `M${maxId + 1}`; // Incrementa para generar el próximo ID
        } else {
            nuevoId = "M1"; // Si no hay registros, empieza desde M1
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

// Endpoint para guardar la muestra
router.post("/guardarMuestra", async (req, res) => {
    const { muId, parcelaId, ubicacion, fecha, cantidadMuestra, calidad, fertilidadId } = req.body;

    try {
        await db.query(
            `INSERT INTO SM_B_MUESTRAS 
            (MU_ID, FER_ID, PARC_ID, MU_CANTIDADMATERIAORGANICA, MU_CALIDADMATERIAORGANICA, MU_FECHA, MU_CANTIDAD, MU_SECTOR) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [muId, fertilidadId, parcelaId, cantidadMuestra, calidad, fecha, cantidadMuestra, ubicacion]
        );

        res.status(201).json({ success: "Muestra guardada correctamente" });
    } catch (error) {
        console.error("Error al guardar la muestra:", error);
        res.status(500).json({ error: "Error al guardar la muestra en la base de datos." });
    }
});


module.exports = router;

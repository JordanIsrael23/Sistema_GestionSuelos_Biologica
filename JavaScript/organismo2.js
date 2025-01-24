const express = require("express");
const router = express.Router();
const conexion = require("./database");

// Obtener tipos de organismos
router.get("/tiposOrganismos", async (req, res) => {
    try {
        const respuesta = await conexion.query("SELECT * FROM SM_B_TIPOSORGANISMOS");
        res.json(respuesta.rows);
    } catch (error) {
        console.error("Error al consultar tipos de organismos:", error);
        res.status(500).send("Error al buscar datos");
    }
});

// Obtener órdenes
router.get("/ordenes", async (req, res) => {
    try {
        const respuesta = await conexion.query("SELECT * FROM SM_B_TIPOORDENES");
        res.json(respuesta.rows);
    } catch (error) {
        console.error("Error al consultar órdenes:", error);
        res.status(500).send("Error al buscar datos");
    }
});

// Obtener el próximo ID de organismo
router.get("/proximoIdOrganismo", async (req, res) => {
    try {
        const result = await conexion.query("SELECT MAX(CAST(SUBSTRING(OR_ID, 2) AS INTEGER)) AS max_id FROM SM_B_ORGANISMOS");

        let nuevoId;
        if (result.rows[0].max_id !== null) {
            const maxId = result.rows[0].max_id; // Número más alto encontrado
            nuevoId = `O${maxId + 1}`; // Incrementa para generar el próximo ID
        } else {
            nuevoId = "O1"; // Si no hay registros, empieza desde O1
        }

        res.json({ nuevoId });
    } catch (error) {
        console.error("Error al obtener el próximo ID de organismo:", error);
        res.status(500).json({ error: "Error del servidor al generar el próximo ID de organismo." });
    }
});

// Guardar organismo
router.post("/guardarOrganismo", async (req, res) => {
    const { orId, toId, torId, orNombre } = req.body;

    try {
        await conexion.query(
            `INSERT INTO SM_B_ORGANISMOS (OR_ID, TO_ID, TOR_ID, OR_NOMBRE) 
            VALUES ($1, $2, $3, $4)`,
            [orId, toId, torId, orNombre]
        );

        res.status(201).json({ success: "Organismo guardado correctamente" });
    } catch (error) {
        console.error("Error al guardar el organismo:", error);
        res.status(500).json({ error: "Error al guardar el organismo en la base de datos." });
    }
});

module.exports = router;

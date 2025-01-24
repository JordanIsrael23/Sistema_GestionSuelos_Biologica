const express = require("express");
const router = express.Router();
const conexion = require("./database");

// Ruta para obtener tipos de organismos
router.get("/tipoorganismo", async (req, res) => {
    try {
        const respuesta = await conexion.query("SELECT * FROM SM_B_TIPOSORGANISMOS");
        res.json(respuesta.rows);
    } catch (error) {
        console.error("Error al consultar tipos de organismos:", error);
        res.status(500).send("Error al buscar datos");
    }
});

// Ruta para obtener organismos por tipo
router.get("/listaorganismos/:to_id", async (req, res) => {
    try {
        const { to_id } = req.params;
        const respuesta = await conexion.query(
            "SELECT * FROM SM_B_ORGANISMOS WHERE TO_ID = $1",
            [to_id]
        );
        res.json(respuesta.rows);
    } catch (error) {
        console.error("Error al consultar organismos:", error);
        res.status(500).send("Error al buscar datos");
    }
});

module.exports = router;

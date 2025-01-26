const fecha = document.getElementById('fecha');

// Crear una fecha local sin la hora para evitar problemas de huso horario
const hoy = new Date();
const anio = hoy.getFullYear();
const mes = String(hoy.getMonth() + 1).padStart(2, '0');
const dia = String(hoy.getDate()).padStart(2, '0');

// Formatear la fecha como YYYY-MM-DD
const resultado = `${anio}-${mes}-${dia}`;

// Asignar el valor al input de fecha
fecha.value = resultado;


const fecha = document.getElementById('fecha');

const hoy = new Date();

const anio = hoy.getFullYear();
const mes = String(hoy.getMonth()+1).padStart(2,'0');
const dia = String(hoy.getDate()).padStart(2,'0');

const resultado  = `${anio}-${mes}-${dia}` ;

fecha.value = resultado;

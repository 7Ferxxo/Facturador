document.addEventListener('DOMContentLoaded', () => {
    const tablaBody = document.querySelector('#tabla-recibos tbody');

    fetch('/get-recibos')
        .then(response => response.json())
        .then(data => {
            
            tablaBody.innerHTML = '';

            
            data.forEach(recibo => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${recibo.id}</td>
                    <td>${recibo.cliente}</td>
                    <td>${recibo.casillero}</td>
                    <td>$${recibo.monto}</td>
                    <td>${recibo.fecha}</td>
                    <td>${recibo.email_cliente}</td>
                `;
                tablaBody.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error al cargar los recibos:', error);
            tablaBody.innerHTML = '<tr><td colspan="6">No se pudieron cargar los recibos.</td></tr>';
        });
});
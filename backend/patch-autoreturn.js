const fs = require('fs');
let code = fs.readFileSync('src/services/paymentService.js', 'utf8');

const injection = `
      await connection.commit();
      
      // AUTO-RETORNO DTE
      try {
        const dteEventosService = require('./dteEventosService');
        const [dtes] = await pool.query("SELECT uuid_generation, dte_type FROM dte_headers WHERE reservation_id = ? AND transmission_status = 'accepted'", [pago.reservation_id]);
        for (const dte of dtes) {
          if (['01', '11', '14'].includes(dte.dte_type)) {
            await dteEventosService.retornarDTE(dte.uuid_generation, {
              motivo: \`Reembolso autom\u00E1tico: \${reason}\`,
              responsable: { nombre: usuario ? usuario.username : 'SISTEMA', tipoDoc: '36', numDoc: '00000000000000' }
            });
            console.log(\`[\u2705 FISCAL] Evento de retorno automatizado para DTE \${dte.uuid_generation}\`);
          } else {
            console.log(\`[\u26A0 FISCAL] DTE \${dte.uuid_generation} de tipo \${dte.dte_type} requiere Invalidaci\u00F3n o Nota de Cr\u00E9dito manual, no aplica Retorno\`);
          }
        }
      } catch (evtErr) {
        console.error('Error al generar evento de retorno autom\u00E1tico:', evtErr);
      }

      return { refund_id: gateway.refund_id, amount: montoRef };
`;

code = code.replace(
  "await connection.commit();\n      return { refund_id: gateway.refund_id, amount: montoRef };",
  injection
);

fs.writeFileSync('src/services/paymentService.js', code);

// src/jobs/stock-alert-job.ts
import { CronJob } from 'cron';
import { StockAlertService } from '../helpers/stock-alerts';
import { pool } from '../config/db';

const stockAlertService = new StockAlertService(pool);

// Ejecutar todos los días a las 8:00 AM
const stockAlertJob = new CronJob('0 8 * * *', async () => {
  console.log('🔔 Ejecutando verificación automática de stock bajo...');
  try {
    const alertas = await stockAlertService.verificarStockBajoGeneral();
    console.log(`✅ Verificación completada. ${alertas.length} productos con stock bajo.`);
  } catch (error: any) {
    console.error('❌ Error en verificación automática de stock:', error.message);
  }
});

// Iniciar el job
stockAlertJob.start();
console.log('🔔 Job de alertas de stock programado (8:00 AM diario)');

export { stockAlertJob };

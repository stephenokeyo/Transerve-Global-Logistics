import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateLiveCarrierRates, buildProgrammaticShipment } from './src/services/carrierIntegration.ts';
import { 
  getDbUsers, upsertDbUser, updateDbUserRole, 
  getDbShipments, getDbShipmentByTracking, insertDbShipment, 
  getDbAuditLogs, insertDbAuditLog 
} from './src/db/queries.ts';
import { optionalAuth, requireAuth } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory fallback cache
const backendShipments: Map<string, any> = new Map();

// API: Get live carrier rate quotes based on package dimensions, weight, origin, destination
app.post('/api/carriers/rates', (req, res) => {
  try {
    const {
      originZip,
      originCountry = 'United States',
      destZip,
      destCountry = 'United States',
      weightKg = 1.0,
      lengthCm = 20,
      widthCm = 15,
      heightCm = 10,
      packageType = 'box',
      declaredValueUsd = 100,
      isFragile = false,
      isColdChain = false,
      requiresSignature = false,
    } = req.body;

    const rates = calculateLiveCarrierRates({
      originZip: originZip || '60607',
      originCountry,
      destZip: destZip || '75261',
      destCountry,
      weightKg: Number(weightKg),
      lengthCm: Number(lengthCm),
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
      packageType,
      declaredValueUsd: Number(declaredValueUsd),
      isFragile: Boolean(isFragile),
      isColdChain: Boolean(isColdChain),
      requiresSignature: Boolean(requiresSignature),
    });

    res.json({
      success: true,
      ratesCount: rates.length,
      rates,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Programmatically generate shipping label through carrier API and persist to Cloud SQL
app.post('/api/labels/generate', async (req, res) => {
  try {
    const { shipper, recipient, packageDetails, selectedRate, specialInstructions } = req.body;

    if (!shipper || !recipient || !packageDetails || !selectedRate) {
      return res.status(400).json({ success: false, error: 'Missing required shipment parameters' });
    }

    const shipment = buildProgrammaticShipment({
      shipper,
      recipient,
      packageDetails,
      selectedRate,
      specialInstructions,
    });

    // Save in memory
    backendShipments.set(shipment.trackingNumber, shipment);

    // Save to Cloud SQL PostgreSQL
    try {
      await insertDbShipment(shipment);
    } catch (dbErr) {
      console.warn('Note: Stored in memory, DB sync notice:', dbErr);
    }

    res.json({
      success: true,
      message: `Label successfully created via ${selectedRate.carrier.toUpperCase()} API`,
      shipment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get all shipments (from Cloud SQL with fallback)
app.get('/api/shipments', async (_req, res) => {
  try {
    const dbRows = await getDbShipments();
    if (dbRows && dbRows.length > 0) {
      return res.json({ success: true, shipments: dbRows });
    }
  } catch (err) {
    console.warn('Cloud SQL read fallback to memory:', err);
  }
  res.json({ success: true, shipments: Array.from(backendShipments.values()) });
});

// API: Track shipment by tracking number
app.get('/api/tracking/:trackingNumber', async (req, res) => {
  const { trackingNumber } = req.params;

  try {
    const dbRow = await getDbShipmentByTracking(trackingNumber);
    if (dbRow) {
      return res.json({ success: true, shipment: dbRow });
    }
  } catch (err) {
    console.warn('Cloud SQL tracking lookup notice:', err);
  }

  const shipment = backendShipments.get(trackingNumber.toUpperCase());
  if (shipment) {
    res.json({ success: true, shipment });
  } else {
    res.status(404).json({ success: false, message: 'Shipment not found in carrier registry' });
  }
});

// API: User Management endpoints (Cloud SQL backed)
app.get('/api/users', async (_req, res) => {
  try {
    const dbUsers = await getDbUsers();
    res.json({
      success: true,
      users: dbUsers,
      roles: ['admin', 'shipper', 'customer'],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'shipper', 'customer'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role specified' });
  }

  try {
    const updated = await updateDbUserRole(id, role);
    res.json({
      success: true,
      message: `User ${id} role updated to ${role}`,
      user: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Sync authenticated user from Google Sign-In into Cloud SQL
app.post('/api/auth/google-sync', optionalAuth, async (req, res) => {
  try {
    const { uid, email, name, company } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ success: false, error: 'Missing uid or email' });
    }

    const user = await upsertDbUser({
      uid,
      email,
      name: name || email.split('@')[0],
      company,
    });

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/audit-logs', async (_req, res) => {
  try {
    const logs = await getDbAuditLogs();
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Transerve Logistics Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

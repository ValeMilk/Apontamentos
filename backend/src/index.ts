import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import dns from 'dns';
import { Server } from 'http';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import attendanceRoutes from './routes/attendance.js';
import supervisorsRoutes from './routes/supervisors.js';
import employeesRoutes from './routes/employees.js';
import monthsRoutes from './routes/months.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/supervisors', supervisorsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/months', monthsRoutes);

// new routes were added: attendance (save/fetch) and justifications

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-manager';
const host = '0.0.0.0';
const reconnectIntervalMs = 10000;

const mongooseConnectOptions = {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 60000,
  family: 4 as const,
  retryWrites: true,
  maxPoolSize: 10,
  minPoolSize: 5,
};

let server: Server | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let connecting = false;

console.log('🔍 Debug Info:');
console.log('MongoDB URI carregada:', mongoUri ? '✅ Sim' : '❌ Não');
console.log('PORT:', port);
console.log('NODE_ENV:', process.env.NODE_ENV);

function startHttpServer() {
  if (server?.listening) return;

  server = app.listen(Number(port), host, () => {
    console.log(`✅ Backend listening on http://${host}:${port}`);
  });

  server.on('error', (error: any) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`❌ Porta ${port} em uso. Nova tentativa em 3s...`);
      setTimeout(() => startHttpServer(), 3000);
      return;
    }
    console.error('❌ Erro no servidor HTTP:', error);
  });
}

async function connectMongo() {
  if (connecting || mongoose.connection.readyState === 1) return;
  connecting = true;
  try {
    console.log('📡 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri, mongooseConnectOptions);
    console.log('✅ Conectado ao MongoDB com sucesso!');
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  } catch (error) {
    console.error('❌ Falha ao conectar no MongoDB:', error);
  } finally {
    connecting = false;
  }
}

function scheduleMongoReconnect() {
  if (reconnectTimer) return;
  console.warn(`⚠️ Tentarei reconectar ao MongoDB a cada ${reconnectIntervalMs / 1000}s.`);
  reconnectTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      clearInterval(reconnectTimer!);
      reconnectTimer = null;
      return;
    }
    console.log('🔁 Tentando reconectar ao MongoDB...');
    await connectMongo();
  }, reconnectIntervalMs);
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB desconectado.');
  scheduleMongoReconnect();
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Erro da conexão MongoDB:', error);
  scheduleMongoReconnect();
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection capturada:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception capturada:', error);
});

async function shutdown(signal: string) {
  console.log(`\n🛑 Recebido ${signal}. Encerrando backend...`);
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  await mongoose.disconnect().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

async function main() {
  try {
    // Forçar resolução DNS via servidores públicos (corrige `querySrv ECONNREFUSED`)
    try{
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('🔧 DNS servers ajustados para: 8.8.8.8, 1.1.1.1');
    }catch(e){ console.warn('⚠️ Não foi possível setar DNS servers:', e); }
    startHttpServer();
    await connectMongo();

    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB conectado. Seed será executado via startup script.');
    } else {
      console.warn('⚠️ Servidor HTTP ativo sem MongoDB no momento.');
      scheduleMongoReconnect();
    }
  } catch (err) {
    console.error('❌ Erro na inicialização:', err);
    startHttpServer();
    scheduleMongoReconnect();
  }
}

main();

# Backend Dockerfile - Node.js + Express
FROM node:20-alpine AS base

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório public e copiar CSV para seed
RUN mkdir -p ./public
COPY ../frontend/public/Pasta1.csv ./public/Pasta1.csv

# Copiar script de seed JavaScript
COPY ./scripts/seed-employees.js ./dist/scripts/seed-employees.js

# Build TypeScript
RUN npm install -D typescript tsx @types/node
RUN npm run build

# Limpar dev dependencies
RUN npm prune --production

# Copiar start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expor porta do backend
EXPOSE 5000

# Variáveis de ambiente (serão sobrescritas pelo docker-compose)
ENV NODE_ENV=production
ENV PORT=5000

# Comando de inicialização
CMD ["/app/start.sh"]

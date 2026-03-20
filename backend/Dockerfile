# Backend Dockerfile - Node.js + Express
FROM node:20-alpine AS base

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm install -D typescript tsx @types/node
RUN npm run build

# Limpar dev dependencies
RUN npm prune --production

# Expor porta do backend
EXPOSE 5000

# Variáveis de ambiente (serão sobrescritas pelo docker-compose)
ENV NODE_ENV=production
ENV PORT=5000

# Criar script de inicialização
RUN echo '#!/bin/sh\n\
echo "Running employee seed..."\n\
npm run init-seed || true\n\
echo "Starting application..."\n\
node dist/index.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Comando de inicialização
CMD ["/app/start.sh"]

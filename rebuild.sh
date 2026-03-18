#!/bin/bash
cd /opt/attendance-manager && docker-compose up -d --build backend && \
echo "Docker rebuild iniciado..." && \
sleep 10 && \
echo "Chamando endpoint de population..." && \
curl -X POST http://localhost:5000/api/auth/debug/populate-employees \
  -H "Content-Type: application/json" && \
echo "Feito!"

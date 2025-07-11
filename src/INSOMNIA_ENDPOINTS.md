# 🚀 Endpoints para Testing en Insomnia

## 📧 Automated Emails - Endpoints de Testing

### Base URL

```
http://localhost:3000
```

### Headers necesarios para endpoints protegidos:

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## 🧪 1. Test Email (Corregido)

**Endpoint:** `POST /automated-emails/test`  
**Descripción:** Envía un email de prueba específico  
**Autenticación:** No requerida (solo en desarrollo)

**Body (JSON):**

```json
{
  "type": "company",
  "userEmail": "test@ejemplo.com"
}
```

**Tipos disponibles:**

- `"company"` - Recordatorio para empresas
- `"ambassador"` - Recordatorio para embajadores
- `"celebration"` - Celebración para embajadores

**Ejemplo de respuesta exitosa:**

```json
{
  "success": true,
  "message": "Email de prueba enviado exitosamente",
  "details": {
    "success": true,
    "message": "Email de prueba company enviado exitosamente",
    "type": "company"
  },
  "sentTo": "test@ejemplo.com",
  "emailType": "company"
}
```

---

## 🔧 2. Ejecutar Verificaciones Manuales

**Endpoint:** `POST /automated-emails/run-checks`  
**Descripción:** Ejecuta manualmente las verificaciones de inactividad  
**Autenticación:** Requerida (solo Admin)

**Body:** Vacío `{}`

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "message": "Verificaciones iniciadas en segundo plano",
  "executedBy": "admin@ejemplo.com",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

---

## 🎉 3. Ejecutar Celebraciones Manuales

**Endpoint:** `POST /automated-emails/run-celebrations`  
**Descripción:** Ejecuta manualmente las celebraciones de embajadores  
**Autenticación:** Requerida (solo Admin)

**Body:** Vacío `{}`

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "message": "Celebraciones iniciadas en segundo plano",
  "executedBy": "admin@ejemplo.com",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

---

## 📊 4. Obtener Estadísticas de Emails

**Endpoint:** `GET /automated-emails/stats`  
**Descripción:** Obtiene estadísticas de emails automáticos  
**Autenticación:** Requerida (solo Admin)

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "stats": {
    "totalEmailsSent": 156,
    "companyReminders": 45,
    "ambassadorReminders": 78,
    "celebrations": 33,
    "lastExecution": "2024-12-26T10:00:00.000Z",
    "todaysSent": 12,
    "thisWeekSent": 45,
    "thisMonthSent": 156
  },
  "message": "Estadísticas obtenidas exitosamente",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

---

## 🆕 5. Envío Manual Específico (Nuevo)

**Endpoint:** `POST /automated-emails/send-manual`  
**Descripción:** Envía email manual con más opciones  
**Autenticación:** Requerida (solo Admin)

**Body (JSON):**

```json
{
  "type": "company",
  "userEmail": "usuario@empresa.com",
  "userName": "María García",
  "customMessage": "Mensaje personalizado opcional"
}
```

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "message": "Email manual enviado exitosamente",
  "details": {
    "success": true,
    "message": "Email manual company enviado exitosamente a María García",
    "type": "company"
  },
  "sentTo": "usuario@empresa.com",
  "sentBy": "admin@ejemplo.com",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

---

## 📋 6. Obtener Historial de Emails (Nuevo)

**Endpoint:** `GET /automated-emails/history`  
**Descripción:** Obtiene historial de emails enviados  
**Autenticación:** Requerida (solo Admin)

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "history": [
    {
      "id": "1703606400000",
      "type": "manual",
      "recipient": "test@ejemplo.com",
      "sentAt": "2024-12-26T15:30:00.000Z",
      "status": "success",
      "adminUser": "admin@ejemplo.com"
    },
    {
      "id": "1703606300000",
      "type": "company",
      "recipient": "empresa@test.com",
      "sentAt": "2024-12-26T15:28:00.000Z",
      "status": "success"
    }
  ],
  "message": "Historial obtenido exitosamente",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

---

## ⚙️ 7. Estado de Cron Jobs (Nuevo)

**Endpoint:** `GET /automated-emails/cron-status`  
**Descripción:** Obtiene el estado de los trabajos programados  
**Autenticación:** Requerida (solo Admin)

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "cronJobs": [
    {
      "name": "daily-inactivity-check",
      "description": "Verificación diaria de usuarios inactivos",
      "schedule": "0 10 * * *",
      "lastExecution": "2024-12-26T10:00:00.000Z",
      "nextExecution": "2024-12-27T10:00:00.000Z",
      "isActive": true,
      "totalExecutions": 45
    },
    {
      "name": "weekly-ambassador-celebration",
      "description": "Celebraciones semanales de embajadores",
      "schedule": "0 9 * * 1",
      "lastExecution": "2024-12-23T09:00:00.000Z",
      "nextExecution": "2024-12-30T09:00:00.000Z",
      "isActive": true,
      "totalExecutions": 12
    }
  ],
  "message": "Estado de cron jobs obtenido exitosamente",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

---

## 🧪 8. Endpoint de Testing Avanzado (Nuevo)

**Endpoint:** `POST /automated-emails/test-advanced`  
**Descripción:** Testing avanzado con más opciones  
**Autenticación:** No requerida (solo en desarrollo)

**Body (JSON):**

```json
{
  "type": "celebration",
  "userEmail": "embajador@test.com",
  "userName": "Carlos López",
  "daysAsAmbassador": 30,
  "totalCommissions": 150.75,
  "totalReferrals": 5,
  "customData": {
    "specialMessage": "¡Felicidades por tu primer mes!"
  }
}
```

---

## 📤 9. Test de Múltiples Emails

**Endpoint:** `POST /automated-emails/test-bulk`  
**Descripción:** Envía múltiples emails de prueba  
**Autenticación:** No requerida (solo en desarrollo)

**Body (JSON):**

```json
{
  "emails": [
    {
      "type": "company",
      "userEmail": "empresa1@test.com",
      "userName": "Empresa 1"
    },
    {
      "type": "ambassador",
      "userEmail": "embajador1@test.com",
      "userName": "Embajador 1"
    },
    {
      "type": "celebration",
      "userEmail": "embajador2@test.com",
      "userName": "Embajador 2"
    }
  ]
}
```

---

## 🔍 10. Validar Configuración de Email

**Endpoint:** `GET /automated-emails/health-check`  
**Descripción:** Verifica la configuración del sistema de emails  
**Autenticación:** Requerida (solo Admin)

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "emailService": {
    "status": "healthy",
    "provider": "Gmail SMTP",
    "lastConnection": "2024-12-26T15:30:00.000Z"
  },
  "cronJobs": {
    "status": "active",
    "totalJobs": 2,
    "activeJobs": 2
  },
  "templates": {
    "company": "✅ Available",
    "ambassador": "✅ Available",
    "celebration": "✅ Available"
  },
  "message": "Sistema de emails funcionando correctamente"
}
```

---

## 🔐 Autenticación

Para endpoints que requieren autenticación, necesitas:

1. **Obtener token JWT** (endpoint de login de tu aplicación)
2. **Incluir en headers:**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## ⚠️ Códigos de Error Comunes

- **400 Bad Request:** Datos faltantes o inválidos
- **401 Unauthorized:** Token inválido o faltante
- **403 Forbidden:** No tienes permisos (solo admin)
- **500 Internal Server Error:** Error del servidor

---

## 🧪 Collection de Insomnia

Puedes importar esta colección en Insomnia:

```json
{
  "name": "Automated Emails API",
  "requests": [
    {
      "name": "Test Email",
      "method": "POST",
      "url": "http://localhost:3000/automated-emails/test",
      "body": {
        "type": "company",
        "userEmail": "test@ejemplo.com"
      }
    },
    {
      "name": "Run Checks",
      "method": "POST",
      "url": "http://localhost:3000/automated-emails/run-checks",
      "headers": {
        "Authorization": "Bearer {{token}}"
      }
    },
    {
      "name": "Get Stats",
      "method": "GET",
      "url": "http://localhost:3000/automated-emails/stats",
      "headers": {
        "Authorization": "Bearer {{token}}"
      }
    }
  ]
}
```

---

¡Con estos endpoints puedes probar completamente el sistema de emails automáticos desde Insomnia! 🚀

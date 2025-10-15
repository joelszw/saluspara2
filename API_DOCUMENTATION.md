# 📡 API Documentation - Salustia Medical Assistant

Documentación completa de todas las Edge Functions y endpoints de la API.

---

## 🔐 Autenticación

Todas las funciones protegidas requieren un JWT token válido:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  },
  body: { /* datos */ }
});
```

---

## 🤖 AI Functions

### ask-medgemma

Consulta médica con IA usando Llama 3.3 70B.

**Endpoint:** `POST /functions/v1/ask-medgemma`

**Auth:** ✅ Requerida

**Request:**
```json
{
  "prompt": "¿Cuáles son los síntomas de la diabetes?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hola"
    },
    {
      "role": "assistant", 
      "content": "Hola, ¿en qué puedo ayudarte?"
    }
  ]
}
```

**Response:**
```json
{
  "response": "Los síntomas principales de la diabetes incluyen...",
  "usage": {
    "allowed": true,
    "daily_used": 2,
    "daily_limit": 3,
    "monthly_used": 15,
    "monthly_limit": 50
  }
}
```

**Errores:**
- `400` - Prompt faltante
- `401` - No autenticado
- `403` - Límite de uso excedido
- `500` - Error del modelo IA

---

### generate-summary

Genera resumen médico de una consulta.

**Endpoint:** `POST /functions/v1/generate-summary`

**Auth:** ✅ Requerida

**Request:**
```json
{
  "queryId": "uuid-de-la-query"
}
```

**Response:**
```json
{
  "summary": "Resumen médico generado...",
  "queryId": "uuid-de-la-query"
}
```

---

## 🔍 Search Functions

### pubmed-search

Busca artículos científicos en PubMed.

**Endpoint:** `POST /functions/v1/pubmed-search`

**Auth:** ✅ Requerida

**Request:**
```json
{
  "keywords": ["diabetes", "treatment"],
  "maxResults": 5
}
```

**Response:**
```json
{
  "articles": [
    {
      "pmid": "12345678",
      "title": "Diabetes Treatment Guidelines",
      "authors": ["Smith J", "Doe A"],
      "journal": "Medical Journal",
      "year": "2024",
      "abstract": "Abstract text...",
      "doi": "10.1234/example",
      "url": "https://pubmed.ncbi.nlm.nih.gov/12345678/"
    }
  ],
  "count": 5
}
```

---

### europe-pmc-search

Busca en Europe PMC (alternativa a PubMed).

**Endpoint:** `POST /functions/v1/europe-pmc-search`

**Auth:** ✅ Requerida

**Request:** Igual que pubmed-search

**Response:** Igual que pubmed-search

---

## 👤 User Functions

### change-password

Cambia la contraseña del usuario autenticado.

**Endpoint:** `POST /functions/v1/change-password`

**Auth:** ✅ Requerida

**Request:**
```json
{
  "newPassword": "NuevaPassword123!"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

**Errores:**
- `400` - Password inválido (muy corto)
- `401` - No autenticado
- `500` - Error al actualizar

---

### admin-reset-password

Admin resetea la password de un usuario.

**Endpoint:** `POST /functions/v1/admin-reset-password`

**Auth:** ✅ Requerida (debe ser admin)

**Request:**
```json
{
  "userId": "uuid-del-usuario",
  "newPassword": "TempPassword123!"
}
```

**Response:**
```json
{
  "message": "Password reset successfully",
  "userId": "uuid-del-usuario"
}
```

---

### promote-admin

Promueve un usuario a admin (solo primera vez).

**Endpoint:** `POST /functions/v1/promote-admin`

**Auth:** ✅ Requerida

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "User promoted to admin successfully",
  "email": "user@example.com"
}
```

**Validaciones:**
- Solo puede promover su propio email
- Email debe estar en ALLOWED_PROMOTION_EMAILS
- Solo funciona para primer admin

---

## 📊 Data Functions

### export-history

Exporta historial de consultas del usuario.

**Endpoint:** `POST /functions/v1/export-history`

**Auth:** ✅ Requerida

**Request:**
```json
{
  "format": "json",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

**Response:**
```json
{
  "queries": [
    {
      "id": "uuid",
      "prompt": "Pregunta médica",
      "response": "Respuesta IA",
      "timestamp": "2024-01-15T10:30:00Z",
      "summary": "Resumen generado",
      "pubmed_references": [...]
    }
  ],
  "count": 42,
  "format": "json"
}
```

**Formatos disponibles:**
- `json` - JSON estructurado
- `csv` - CSV para Excel
- `txt` - Texto plano

---

## 📧 Email Functions

### send-contact-email

Envía email de contacto (formulario web).

**Endpoint:** `POST /functions/v1/send-contact-email`

**Auth:** ❌ Pública

**Request:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "message": "Tengo una consulta sobre..."
}
```

**Response:**
```json
{
  "message": "Email sent successfully",
  "emailId": "re_abc123"
}
```

---

### send-recovery-email

Envía email de recuperación de contraseña.

**Endpoint:** `POST /functions/v1/send-recovery-email`

**Auth:** ❌ Pública

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Recovery email sent"
}
```

---

## 🗄️ Database Tables API

### Queries Table

**GET:** `supabase.from('queries').select()`

```typescript
const { data, error } = await supabase
  .from('queries')
  .select('*')
  .eq('user_id', userId)
  .order('timestamp', { ascending: false })
  .limit(50);
```

**INSERT:** `supabase.from('queries').insert()`

```typescript
const { data, error } = await supabase
  .from('queries')
  .insert({
    user_id: userId,
    prompt: "Pregunta médica",
    response: "Respuesta IA",
    keywords: ["diabetes", "treatment"]
  });
```

---

### Users Table

**GET:** Solo propio usuario o admin

```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

---

### User Roles Table

**GET:** Roles del usuario

```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);
```

---

## 🔒 Security Events

**Solo accesible via service_role**

```typescript
// Solo en Edge Functions con service_role
const { data, error } = await supabaseAdmin
  .from('security_events')
  .insert({
    event_type: 'LOGIN_FAILED',
    user_id: userId,
    ip_address: clientIp,
    details: { reason: 'invalid_password' }
  });
```

---

## ⚡ Rate Limits

| Role | Daily Limit | Monthly Limit |
|------|-------------|---------------|
| free | 3 | 50 |
| test | 50 | 500 |
| premium | 100 | 1,000 |
| admin | ∞ | ∞ |

---

## 🚨 Error Codes

| Code | Descripción |
|------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos o límite excedido |
| 404 | Not Found - Recurso no encontrado |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error - Error del servidor |

---

Made with ❤️ using Lovable

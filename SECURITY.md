# Security Guide

Security best practices and guidelines for the Agri Fertilizer Shop Management System.

## 🔐 Security Principles

1. **Confidentiality**: Data is protected from unauthorized access
2. **Integrity**: Data is not modified without authorization
3. **Availability**: System is accessible when needed
4. **Authenticity**: Users are who they claim to be
5. **Non-repudiation**: Users cannot deny their actions

## Authentication & Authorization

### Password Security

✅ **Do's:**
- Use strong passwords (12+ characters)
- Include uppercase, lowercase, numbers, symbols
- Hash with bcryptjs (10+ salt rounds)
- Never store plain passwords
- Force password change on first login

❌ **Don'ts:**
- Never log passwords
- Don't send passwords in API responses
- Don't use weak hashing (MD5, SHA1)
- Never hardcode passwords

### JWT Tokens

✅ **Do's:**
- Set expiration to 24 hours
- Use strong SECRET_KEY (32+ characters)
- Store in httpOnly cookies (recommended)
- Include user ID and email in payload
- Verify signature on backend

❌ **Don'ts:**
- Never expose JWT_SECRET in client-side code
- Don't store sensitive data in token
- Don't set expirations too long
- Never transmit tokens in URLs

### Generating Strong JWT Secret

```bash
# Generate random 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

### Role-Based Access Control

**Roles:**
- ADMIN: Full system access, user management
- STAFF: Create/view transactions, no user management

**Protection:**
```javascript
// Only admins can delete products
router.delete('/products/:id', 
  authenticate,
  authorize('ADMIN'),
  deleteProduct
);
```

## Data Protection

### Encryption

**In Transit:**
- Use HTTPS/TLS 1.2+
- All API calls encrypted
- SSL certificates valid and current

**At Rest:**
- Sensitive data encrypted in database
- Passwords hashed with bcryptjs
- PDFs stored securely in Supabase

### Database Security

✅ **Practices:**
- Use prepared statements (Prisma does this)
- Validate all inputs
- Limit database user permissions
- Use connection pooling
- Enable database backups

### Supabase Security

✅ **Setup:**
- Enable Row Level Security (RLS)
- Use service role key only on backend
- Use anon key for public operations
- Restrict storage bucket access
- Enable database backups

## Input Validation

### Server-Side Validation

Always validate on backend:

```javascript
// ✅ Good
if (!email || !validateEmail(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}

// ❌ Bad - Trusting client-side only
const user = await createUser(req.body.email);
```

### Validation Rules

**Email:**
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**Phone Number:**
```javascript
const phoneRegex = /^[0-9]{10}$/;  // For India
```

**Product Name:**
```javascript
if (!name || name.length < 2 || name.length > 100) {
  throw new Error('Invalid name');
}
```

### Input Sanitization

```javascript
// Remove HTML/script tags
const sanitize = (str) => {
  return str
    .replace(/[<>]/g, '')
    .trim();
};
```

## API Security

### CORS Configuration

```javascript
// ✅ Good - Specific domain
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// ❌ Bad - Allow all origins
app.use(cors());
```

### Rate Limiting

Consider implementing:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Request Size Limits

```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));
```

## Error Handling

### Don't Expose Sensitive Info

```javascript
// ❌ Bad - Exposes implementation details
catch (error) {
  res.status(500).json({ 
    message: error.message,  // May contain sensitive info
    stack: error.stack
  });
}

// ✅ Good - Generic message
catch (error) {
  console.error('Error:', error);  // Log for debugging
  res.status(500).json({ 
    message: 'Internal server error'
  });
}
```

### Log Errors Properly

```javascript
// Log errors with context
logger.error('Product creation failed', {
  userId: req.user.id,
  timestamp: new Date(),
  error: error.message,
});
```

## Frontend Security

### XSS Prevention

```javascript
// ✅ Good - React escapes by default
<div>{product.name}</div>

// ❌ Bad - Never use dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: data}} />
```

### CSRF Protection

- Use same-site cookies
- Include CSRF tokens in forms
- Validate origin header

### Secure Storage

```javascript
// ✅ Good - httpOnly cookie (recommended)
// Set by server with Set-Cookie header

// ❌ Bad - localStorage (XSS vulnerable)
localStorage.setItem('token', token);

// ❌ Worse - sessionStorage
sessionStorage.setItem('token', token);
```

## Environment Variables

### Never Commit Secrets

```
# .gitignore
.env
.env.local
.env.*.local
```

### Use .env.example

```
# backend/.env.example
DATABASE_URL=<example-url>
JWT_SECRET=<your-secret-here>
```

### Secure Deployment Secrets

Use platform-specific secret management:
- **Vercel**: Environment Variables in Project Settings
- **Render**: Environment Variables in Service Settings
- **GitHub**: Repository Secrets

## Database Security

### Backup Strategy

- Daily automated backups
- Test restore procedures
- Store backups securely
- Retention policy: 30 days

### Access Control

```sql
-- Create database user with limited permissions
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON schema.* TO app_user;

-- Restrict root-like access
```

### Connection Security

```javascript
// Use connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});
```

## File Upload Security

### PDF Storage

✅ **Security:**
- Store in secure bucket
- Generate unique filenames
- Validate file size (< 10MB)
- Scan for malware (recommended)
- Set expiration dates

```javascript
// Generate secure filename
const filename = `invoices/${crypto.randomUUID()}.pdf`;
```

### Restrict Access

```javascript
// Only allow PDF downloads for authorized users
app.get('/invoices/:id/pdf', authenticate, async (req, res) => {
  const invoice = await getInvoice(req.params.id);
  
  if (invoice.userId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Return PDF
});
```

## Third-Party Integration Security

### Supabase

```javascript
// ✅ Use service role key only on backend
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // Backend only
);

// ✅ Use anon key for public operations
const supabasePublic = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY  // Can share with client
);
```

## Monitoring & Logging

### What to Log

✅ **Do Log:**
- Authentication attempts
- Authorization failures
- Data modifications
- Errors and exceptions
- Payment transactions

❌ **Don't Log:**
- Passwords
- API keys/secrets
- PII (Personal Identifiable Information)
- Credit card numbers

### Log Security

```javascript
// Use structured logging
logger.info('User logged in', {
  userId: user.id,
  email: user.email,  // OK - already known
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.get('User-Agent'),
});

// Never log
logger.info('User login', {
  password: user.password,  // ❌ NEVER
  token: req.headers.authorization,  // ❌ NEVER
});
```

### Audit Trail

Maintain audit log for:
- Invoice creation/deletion
- Payment recording
- User access
- Settings changes

```javascript
// Create audit log entry
await auditLog.create({
  action: 'INVOICE_CREATED',
  userId: req.user.id,
  resourceId: invoice.id,
  timestamp: new Date(),
});
```

## Regular Security Tasks

### Weekly
- [ ] Review error logs
- [ ] Check authentication attempts
- [ ] Monitor API usage

### Monthly
- [ ] Update dependencies
- [ ] Review access logs
- [ ] Test backups
- [ ] Security audit

### Quarterly
- [ ] Penetration testing
- [ ] Dependency audit
- [ ] Security review
- [ ] Update security policies

### Yearly
- [ ] Full security audit
- [ ] Compliance check
- [ ] Disaster recovery drill
- [ ] Team security training

## Incident Response

### If Breach Suspected

1. **Immediately:**
   - Stop the service if necessary
   - Isolate affected systems
   - Notify team

2. **Within 1 Hour:**
   - Identify compromised data
   - Prevent further access
   - Begin investigation

3. **Within 24 Hours:**
   - Notify affected users
   - Implement fixes
   - Document incident

4. **Within 72 Hours:**
   - Complete investigation
   - Implement prevention measures
   - Post-mortem analysis

## Compliance

### GDPR Compliance
- User consent for data processing
- Right to data deletion
- Data portability
- Privacy policy

### India-Specific
- GST compliance
- Data localization
- Income tax regulations
- Business registration

## Security Checklist

- [ ] All passwords hashed with bcryptjs
- [ ] JWT tokens have expiration
- [ ] HTTPS enabled everywhere
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] Rate limiting implemented
- [ ] Error messages don't expose details
- [ ] Sensitive data logged securely
- [ ] Database backups automated
- [ ] Dependencies updated
- [ ] Security headers configured
- [ ] CSP headers set
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [GDPR Guide](https://gdpr.eu/)

---

**Security is everyone's responsibility!** 🔒

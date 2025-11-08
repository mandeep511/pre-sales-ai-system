# Future Improvements

Items to address after MVP stabilization.

## Reliability & Infrastructure

### Environment Validation
- Validate all required env vars on startup
- Fail fast with clear error messages
- Document required vs optional variables

### Health Check Endpoints
- Add `/health` endpoint for basic health checks
- Add `/ready` endpoint for readiness probes
- Include Redis, Prisma, and dependency status

### Redis Connection Failure Handling
- Graceful degradation when Redis is unavailable
- Retry logic with exponential backoff
- Fallback to in-memory store for non-critical data

### HTTPS Enforcement
- Add `app.set('trust proxy', 1)` for production
- Redirect HTTP to HTTPS in production
- Validate secure cookies in production

### CORS Configuration
- Support multiple origins for different environments
- Dynamic CORS based on environment
- Whitelist approach for production

## Security Enhancements

### CSRF Protection
- Add `csurf` middleware or use SameSite cookies properly
- Validate CSRF tokens on state-changing requests
- Exempt webhook endpoints from CSRF checks

### Input Validation & Sanitization
- Add validation middleware (joi, yup, or zod)
- Enforce length limits on all inputs
- Sanitize user inputs to prevent injection
- Validate data types and formats

### Database Connection Validation
- Check MongoDB/Prisma connectivity on startup
- Validate Redis connection before accepting requests
- Fail fast if critical dependencies unavailable

## Code Quality

### Auth Guard Race Condition
- Check auth status in login page
- Redirect authenticated users away from login
- Prevent redirect loops

### Error Handling
- Consistent error response format
- Proper error logging with context
- User-friendly error messages

### Testing
- Unit tests for critical paths
- Integration tests for API endpoints
- E2E tests for core workflows


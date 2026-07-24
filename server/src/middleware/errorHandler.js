export function errorHandler(err, req, res, next) {
  console.error('Error:', err)

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors,
    })
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({
      message: 'A record with this information already exists',
    })
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({
      message: 'Referenced record does not exist',
    })
  }

  // Default error response
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, BadRequestException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    if (exception instanceof BadRequestException && typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
    }

    this.logger.error(`HTTP Status: ${status} Error Message: ${message} <=== ${request.method} ${request.url}`);

    response.status(status).json({
      success: false,
      message: message,
    });
  }
}
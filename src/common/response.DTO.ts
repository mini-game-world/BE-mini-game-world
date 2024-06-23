// 응답 DTO 객체 답아서 줌.
export class ResponseDTO<T> {
  success: boolean;
  data?: T;
  message?: string;

  constructor(success: boolean, data: T, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
  }
}
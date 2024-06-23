export class ResponseDTO<T> {
  success: boolean;
  data?: T;
  message?: string;

  constructor(success: boolean, data?: T, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
  }

  static builder<T>() {
    return new ResponseDTOBuilder<T>();
  }
}

class ResponseDTOBuilder<T> {
  private success: boolean;
  private data?: T;
  private message?: string;

  setSuccess(success: boolean): ResponseDTOBuilder<T> {
    this.success = success;
    return this;
  }

  setData(data: T): ResponseDTOBuilder<T> {
    this.data = data;
    return this;
  }

  setMessage(message: string): ResponseDTOBuilder<T> {
    this.message = message;
    return this;
  }

  build(): ResponseDTO<T> {
    return new ResponseDTO(this.success, this.data, this.message);
  }
}
type ApiResponse<T> =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      message: string;
      data: T;
    };
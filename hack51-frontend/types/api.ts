export type ApiResponse<T> = {
  access_token?: string;
  refresh_token?: string;
  user?: any;
  data?: T;
};

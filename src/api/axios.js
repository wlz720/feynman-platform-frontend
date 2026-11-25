import axios from 'axios';

// 不要在这里写死 Content-Type: application/json。
// axios 对普通对象会自动加 JSON 头，写死反而会把 FormData 序列化成 JSON（音频上传会丢文件）。
const apiClient = axios.create({
  // 默认连本机 3000，调试时可用 VITE_API_BASE_URL 指向别的后端实例
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});

// 请求拦截器：每次发请求自动带上token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：Token 过期或无效（401）时清理登录态并回到登录页，避免停在空白报错页
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!/^\/login/.test(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
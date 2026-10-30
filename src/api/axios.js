import axios from 'axios';

// 不要在这里写死 Content-Type: application/json。
// axios 对普通对象会自动加 JSON 头，写死反而会把 FormData 序列化成 JSON（音频上传会丢文件）。
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
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

export default apiClient;
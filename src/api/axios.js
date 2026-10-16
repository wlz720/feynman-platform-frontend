import axios from 'axios';

// 创建axios实例，统一配置后端接口基础地址
const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;

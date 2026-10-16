import { createContext, useState, useContext, useEffect } from 'react';

// 创建全局上下文
const AuthContext = createContext(null);

// 全局状态提供者，包裹整个应用
export function AuthProvider({ children }) {
    // 初始化从浏览器本地存储读token，刷新不丢失
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);

    // token变化时自动同步到localStorage
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    // 登录方法：更新全局token
    const login = (newToken) => {
        setToken(newToken);
    };

    // 登出方法：清空全局状态
    const logout = () => {
        setToken(null);
        setUser(null);
    };

    // 把状态和方法提供给所有子组件
    const value = { token, user, login, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 自定义Hook，方便组件直接使用
export function useAuth() {
    return useContext(AuthContext);
}

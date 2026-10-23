import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'));
    // 新增：用户信息状态，从本地存储初始化
    const [user, setUser] = useState(
        localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
    );

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }, [token]);

    // 登录时同时保存token和用户信息
    const login = (newToken, userInfo) => {
        setToken(newToken);
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    const value = { token, user, login, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
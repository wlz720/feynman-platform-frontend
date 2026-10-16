import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

// 路由守卫：没登录就跳登录页，登录了才显示子页面
function ProtectedRoute() {
    const { token } = useAuth();

    // 没有token，重定向到登录页
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 有token，正常渲染子路由页面
    return <Outlet />;
}

export default ProtectedRoute;

import { useAuth } from '../contexts/AuthContext';
import { planService } from '../services/planService';

export const useCurrentUserWithPlan = () => {
    const { user, loading } = useAuth();

    const isStart = user ? planService.isStartPlan(user) : false;
    const isPro = user ? planService.isProPlan(user) : false;
    const hasPlan = !!user?.plan;

    return {
        user,
        plan: user?.plan,
        isStart,
        isPro,
        hasPlan,
        loading
    };
};

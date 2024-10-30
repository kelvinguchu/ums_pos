import dynamic from 'next/dynamic';
import Loader from '@/components/Loader';

// Dynamically import Signin component with client-side only rendering
// This prevents server-side rendering issues and hydration mismatches
const Signin = dynamic(() => import('@/components/auth/Signin'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader />
    </div>
  ),
});

const SigninPage = () => {
  return <Signin />;
};

export default SigninPage;

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Loader from '@/components/Loader';

// Dynamically import Signup component with client-side only rendering
const Signup = dynamic(() => import("@/components/auth/Signup"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader />
    </div>
  ),
});

const SignupPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    }>
      <Signup />
    </Suspense>
  );
};

export default SignupPage;

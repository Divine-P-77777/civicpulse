'use client';

import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';

const page = () => {
  return (
    <div>
        <h1>History Page</h1>
        <div className="history-content">
            <p>This is the history page content.</p>
            
        </div>

      
    </div>
  )
}

export default page

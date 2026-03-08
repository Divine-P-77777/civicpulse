'use client';

import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ReactNode } from 'react';
import '@/lib/i18n'; // Initialize i18n immediately on the client

export default function Providers({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
}

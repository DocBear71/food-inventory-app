// file: /src/app/layout.js

import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Food Inventory Manager',
    description: 'Manage your food inventory and find recipes based on what you have',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <SessionProvider>
            {children}
        </SessionProvider>
        </body>
        </html>
    );
}
'use client';
// file: /src/components/shopping/SavedShoppingListsButton.js v2 - Updated with Tailwind classes


import { useRouter } from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function SavedShoppingListsButton() {
    const router = useRouter();

    const handleClick = () => {
        router.push('/shopping/saved');
    };

    return (
        <TouchEnhancedButton
            onClick={handleClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg px-6 py-3 text-sm font-medium cursor-pointer flex items-center gap-2 transition-colors shadow-md"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Saved Lists
        </TouchEnhancedButton>
    );
}
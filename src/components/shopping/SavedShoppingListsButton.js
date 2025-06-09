// file: /src/components/shopping/SavedShoppingListsButton.js v1

'use client';

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
            style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
        >
            💾 Saved Lists
        </TouchEnhancedButton>
    );
}
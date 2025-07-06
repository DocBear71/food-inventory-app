'use client';

// components/SafeAreaBackground.js

export default function SafeAreaBackground() {
    return (
        <>
            {/* Top safe area background */}
            <div
                className="fixed top-0 left-0 right-0 bg-white z-50"
                style={{
                    height: 'env(safe-area-inset-top, 0px)'
                }}
            />

            {/* Bottom safe area background */}
            <div
                className="fixed bottom-0 left-0 right-0 bg-white z-50"
                style={{
                    height: 'env(safe-area-inset-bottom, 0px)'
                }}
            />
        </>
    );
}
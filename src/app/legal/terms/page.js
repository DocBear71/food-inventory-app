// Direct access for Apple's EULA requirement
import TermsOfUse from '@/components/legal/TermsOfUse';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <Link href="/" className="flex items-center space-x-2 text-purple-600">
                            <span className="font-semibold">Doc Bear's Comfort Kitchen</span>
                        </Link>
                        <Link href="/legal/privacy" className="text-gray-600 hover:text-gray-900">
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </header>
            <main className="py-8">
                <TermsOfUse />
            </main>
        </div>
    );
}

export const metadata = {
    title: 'Terms of Use (EULA) - Doc Bear\'s Comfort Kitchen',
    description: 'End User License Agreement and Terms of Use for Doc Bear\'s Comfort Kitchen.',
};
// Direct access for Apple's Privacy Policy requirement
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <Link href="/" className="flex items-center space-x-2 text-purple-600">
                            <span className="font-semibold">Doc Bear's Comfort Kitchen</span>
                        </Link>
                        <Link href="/legal/terms" className="text-gray-600 hover:text-gray-900">
                            Terms of Use
                        </Link>
                    </div>
                </div>
            </header>
            <main className="py-8">
                <PrivacyPolicy />
            </main>
        </div>
    );
}

export const metadata = {
    title: 'Privacy Policy - Doc Bear\'s Comfort Kitchen',
    description: 'Privacy Policy for Doc Bear\'s Comfort Kitchen mobile app and web service.',
};
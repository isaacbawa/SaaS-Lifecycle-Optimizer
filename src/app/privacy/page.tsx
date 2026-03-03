import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';

export const metadata: Metadata = {
    title: 'Privacy Policy — LifecycleOS',
    description: 'LifecycleOS privacy policy. How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
    const lastUpdated = 'June 1, 2025';

    return (
        <>
            <MarketingHeader />
            <main className="container max-w-3xl py-16 md:py-24">
                <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
                        <p>
                            When you create an account, we collect your name, email address, and
                            organization details. When you use LifecycleOS, we process the
                            lifecycle events, user identifiers, and metadata that you send
                            through our SDK and APIs.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">2. How We Use Your Data</h2>
                        <p>We use data to:</p>
                        <ul className="list-disc pl-6 space-y-1 mt-2">
                            <li>Provide, operate, and maintain the LifecycleOS platform.</li>
                            <li>Process lifecycle events, segment users, and execute automation flows on your behalf.</li>
                            <li>Improve our services and develop new features.</li>
                            <li>Communicate with you about your account, support requests, and product updates.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">3. Data Sharing</h2>
                        <p>
                            We do not sell your data. We may share information with
                            third-party providers (hosting, email delivery, analytics) only
                            as required to operate the platform. All sub-processors are bound
                            by data processing agreements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">4. Data Retention</h2>
                        <p>
                            We retain your account data for the duration of your subscription
                            and for up to 90 days after account deletion to facilitate
                            recovery. Event data retention follows your plan settings and can
                            be configured in your dashboard.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">5. Security</h2>
                        <p>
                            All data is encrypted in transit (TLS 1.2+) and at rest. We use
                            industry-standard practices including HMAC-signed webhooks,
                            hashed API keys, and role-based access controls.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">6. Your Rights</h2>
                        <p>
                            You may request access to, correction of, or deletion of your
                            personal data at any time by contacting us at{' '}
                            <a href="mailto:privacy@lifecycleos.com" className="text-primary hover:underline">
                                privacy@lifecycleos.com
                            </a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">7. Contact</h2>
                        <p>
                            For privacy-related inquiries, email{' '}
                            <a href="mailto:privacy@lifecycleos.com" className="text-primary hover:underline">
                                privacy@lifecycleos.com
                            </a>.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t text-sm text-muted-foreground">
                    <Link href="/" className="text-primary hover:underline">&larr; Back to home</Link>
                </div>
            </main>
            <MarketingFooter />
        </>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';

export const metadata: Metadata = {
    title: 'Terms of Service - LifecycleOS',
    description: 'LifecycleOS terms of service governing your use of the platform.',
};

export default function TermsPage() {
    const lastUpdated = 'June 1, 2025';

    return (
        <>
            <MarketingHeader />
            <main className="container max-w-3xl py-16 md:py-24">
                <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
                <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using LifecycleOS (&ldquo;the Service&rdquo;), you
                            agree to be bound by these Terms of Service. If you are using
                            the Service on behalf of an organization, you represent that you
                            have the authority to bind that organization.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">2. Accounts</h2>
                        <p>
                            You are responsible for maintaining the security of your account
                            credentials and API keys. You must immediately notify us of any
                            unauthorized use. We are not liable for losses resulting from
                            unauthorized access to your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">3. Acceptable Use</h2>
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-6 space-y-1 mt-2">
                            <li>Use the Service to send unsolicited bulk email (spam).</li>
                            <li>Transmit malicious code or attempt to access other customers&apos; data.</li>
                            <li>Exceed your plan&apos;s usage limits without upgrading.</li>
                            <li>Resell, sublicense, or redistribute the Service without written consent.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">4. Service Availability</h2>
                        <p>
                            We target 99.9% uptime but do not guarantee uninterrupted service.
                            Scheduled maintenance windows will be communicated in advance. We
                            are not liable for downtime caused by third-party infrastructure
                            providers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">5. Data Ownership</h2>
                        <p>
                            You retain all rights to the data you send to LifecycleOS. We
                            claim no ownership over your events, user data, or content. We
                            process your data solely to provide the Service as described in
                            our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">6. Payment &amp; Billing</h2>
                        <p>
                            Paid plans are billed monthly or annually in advance. Fees are
                            non-refundable except as required by law. We may adjust pricing
                            with 30 days&apos; notice before your next billing cycle.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">7. Termination</h2>
                        <p>
                            Either party may terminate the agreement at any time. Upon
                            termination, your data will be retained for 90 days and then
                            permanently deleted. You may export your data during this period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">8. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, LifecycleOS&apos;s total
                            liability is limited to the fees paid by you in the 12 months
                            preceding the claim. We are not liable for indirect, incidental,
                            or consequential damages.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-3">9. Contact</h2>
                        <p>
                            For questions about these terms, email{' '}
                            <a href="mailto:legal@lifecycleos.com" className="text-primary hover:underline">
                                legal@lifecycleos.com
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

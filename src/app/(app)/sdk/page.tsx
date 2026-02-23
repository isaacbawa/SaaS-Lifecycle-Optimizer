import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';

export default function SdkPage() {
  const installCode = `npm install @saas-optimizer/sdk`;
  const initCode = `import { OptimizerSDK } from '@saas-optimizer/sdk';

const optimizer = new OptimizerSDK({
  apiKey: 'YOUR_API_KEY_HERE',
});`;
  const trackEventCode = `// Track user sign up
optimizer.track('user_signed_up', {
  userId: 'user-123',
  properties: {
    plan: 'trial',
    source: 'google',
  }
});

// Identify user and update properties
optimizer.identify('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
});`;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>SDK Setup Guide</CardTitle>
          <CardDescription>
            Integrate our SDK to start capturing product events in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Installation</h3>
            <p className="text-muted-foreground mb-4">
              Install the SDK using your favorite package manager.
            </p>
            <CodeBlock code={installCode} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">2. Initialization</h3>
            <p className="text-muted-foreground mb-4">
              Initialize the SDK in your application's entry point with your API key. You can find your API key in the{' '}
              <a href="/settings" className="text-primary underline">Settings</a> page.
            </p>
            <CodeBlock code={initCode} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">3. Tracking Events</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking user events and identifying users. Here are a couple of examples.
            </p>
            <CodeBlock code={trackEventCode} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-muted-foreground">
              Check out our full documentation for more advanced use cases and examples. If you get stuck, feel free to reach out to our support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

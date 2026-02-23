import { ChurnAnalysisClient } from '@/components/retention/churn-analysis-client';
import { users } from '@/lib/placeholder-data';

export default function RetentionPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">User Retention & Churn Analysis</h1>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Identify users at risk of churning and take action to retain them.
        Analyze user churn risk to get detailed insights and recommendations for
        each user.
      </p>
      <ChurnAnalysisClient users={users} />
    </div>
  );
}

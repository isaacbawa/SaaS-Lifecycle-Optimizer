import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Code, CreditCard, User, Users } from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';

export default function SettingsPage() {
  const teamMembers = [
    { name: 'Admin User', email: 'admin@saasopt.com', role: 'Admin', avatar: 'https://picsum.photos/seed/avatar/40/40' },
    { name: 'Jane Doe', email: 'jane@saasopt.com', role: 'Marketer', avatar: 'https://picsum.photos/seed/jane/40/40' },
  ];
  
  return (
    <div className="grid gap-6">
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-2 h-4 w-4" />Billing</TabsTrigger>
          <TabsTrigger value="api"><Code className="mr-2 h-4 w-4" />API</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your personal profile and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src="https://picsum.photos/seed/avatar/100/100" />
                    <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <Button variant="outline">Change Photo</Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Admin User" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="admin@saasopt.com" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Invite and manage your team members.</CardDescription>
              </div>
              <Button>Invite Member</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(member => (
                    <TableRow key={member.email}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage your subscription and payment methods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="font-medium">Current Plan</h4>
                    <p className="text-muted-foreground">You are on the <span className="font-semibold text-primary">Business Plan</span>.</p>
                </div>
                <Button>Upgrade Plan</Button>
                <Separator />
                <div>
                    <h4 className="font-medium">Payment Method</h4>
                    <p className="text-muted-foreground">Your card ending in 1234.</p>
                </div>
                <Button variant="outline">Update Payment Method</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API & SDK</CardTitle>
              <CardDescription>Access your API keys and SDK documentation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">API Key</h4>
                <p className="text-muted-foreground mb-2">Use this key to initialize the SDK and interact with our API.</p>
                <CodeBlock code="opt_live_a1b2c3d4e5f6g7h8i9j0" />
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Webhooks</h4>
                <p className="text-muted-foreground mb-4">Setup webhooks to receive real-time notifications about events.</p>
                <div className="flex gap-2">
                    <Input placeholder="https://your-app.com/webhook" />
                    <Button>Add Webhook</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

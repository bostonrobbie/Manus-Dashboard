import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Settings,
  Zap,
  BarChart3,
  Plus,
  Minus,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// Toast notifications - using simple alert for now

export default function UserDashboard() {
  const { user } = useAuth();
  const showToast = (opts: { title: string; description?: string; variant?: string }) => {
    // Simple toast implementation
    console.log(`[${opts.variant || 'info'}] ${opts.title}: ${opts.description || ''}`);
  };
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    notificationsEnabled: true,
    autoExecuteEnabled: false,
    quantityMultiplier: 1,
    maxPositionSize: null as number | null,
  });

  // Fetch user subscriptions
  const { data: subscriptions, isLoading: loadingSubscriptions, refetch: refetchSubscriptions } = 
    trpc.subscription.list.useQuery();

  // Fetch available strategies
  const { data: strategies, isLoading: loadingStrategies } = 
    trpc.subscription.availableStrategies.useQuery();

  // Fetch pending signals
  const { data: pendingSignals, isLoading: loadingSignals, refetch: refetchSignals } = 
    trpc.subscription.pendingSignals.useQuery();

  // Fetch subscription stats
  const { data: stats, isLoading: loadingStats } = 
    trpc.subscription.stats.useQuery();

  // Subscribe mutation
  const subscribeMutation = trpc.subscription.subscribe.useMutation({
    onSuccess: () => {
      showToast({ title: 'Subscribed!', description: 'You are now subscribed to this strategy.' });
      refetchSubscriptions();
      setSubscribeDialogOpen(false);
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = trpc.subscription.unsubscribe.useMutation({
    onSuccess: () => {
      showToast({ title: 'Unsubscribed', description: 'You have been unsubscribed from this strategy.' });
      refetchSubscriptions();
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = trpc.subscription.updateSettings.useMutation({
    onSuccess: () => {
      showToast({ title: 'Settings Updated', description: 'Your subscription settings have been saved.' });
      refetchSubscriptions();
      setSettingsDialogOpen(false);
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update signal mutation
  const updateSignalMutation = trpc.subscription.updateSignal.useMutation({
    onSuccess: () => {
      showToast({ title: 'Signal Updated', description: 'Signal status has been updated.' });
      refetchSignals();
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubscribe = () => {
    if (selectedStrategy) {
      subscribeMutation.mutate({
        strategyId: selectedStrategy,
        ...subscriptionSettings,
      });
    }
  };

  const handleUnsubscribe = (strategyId: number) => {
    if (confirm('Are you sure you want to unsubscribe from this strategy?')) {
      unsubscribeMutation.mutate({ strategyId });
    }
  };

  const handleUpdateSettings = () => {
    if (selectedStrategy) {
      updateSettingsMutation.mutate({
        strategyId: selectedStrategy,
        ...subscriptionSettings,
      });
    }
  };

  const handleSignalAction = (signalId: number, action: 'executed' | 'skipped') => {
    updateSignalMutation.mutate({ signalId, action });
  };

  const openSubscribeDialog = (strategyId: number) => {
    setSelectedStrategy(strategyId);
    setSubscriptionSettings({
      notificationsEnabled: true,
      autoExecuteEnabled: false,
      quantityMultiplier: 1,
      maxPositionSize: null,
    });
    setSubscribeDialogOpen(true);
  };

  const openSettingsDialog = (subscription: any) => {
    setSelectedStrategy(subscription.strategyId);
    setSubscriptionSettings({
      notificationsEnabled: subscription.notificationsEnabled,
      autoExecuteEnabled: subscription.autoExecuteEnabled,
      quantityMultiplier: subscription.quantityMultiplier,
      maxPositionSize: subscription.maxPositionSize,
    });
    setSettingsDialogOpen(true);
  };

  // Get subscribed strategy IDs
  const subscribedStrategyIds = new Set(subscriptions?.map(s => s.strategyId) || []);

  // Get unsubscribed strategies
  const unsubscribedStrategies = strategies?.filter(s => !subscribedStrategyIds.has(s.id)) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'Trader'}! Manage your strategy subscriptions and signals.
          </p>
        </div>
        <Button onClick={() => { refetchSubscriptions(); refetchSignals(); }} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{(stats as any)?.pendingSignals || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Executed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.signalsExecuted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Skipped Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats?.signalsSkipped || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions">
            <BarChart3 className="h-4 w-4 mr-2" />
            My Subscriptions
          </TabsTrigger>
          <TabsTrigger value="signals">
            <Zap className="h-4 w-4 mr-2" />
            Pending Signals
            {((stats as any)?.pendingSignals || 0) > 0 && (
              <Badge variant="destructive" className="ml-2">{(stats as any)?.pendingSignals}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover">
            <Plus className="h-4 w-4 mr-2" />
            Discover Strategies
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          {loadingSubscriptions ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading subscriptions...
              </CardContent>
            </Card>
          ) : subscriptions?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">You haven't subscribed to any strategies yet.</p>
                <Button onClick={() => setActiveTab('discover')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Discover Strategies
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions?.map((sub) => (
                <Card key={sub.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{(sub as any).strategyName || sub.strategy?.name || 'Strategy'}</CardTitle>
                      <Badge variant={sub.notificationsEnabled ? 'default' : 'secondary'}>
                        {sub.notificationsEnabled ? <Bell className="h-3 w-3" /> : <Bell className="h-3 w-3 opacity-50" />}
                      </Badge>
                    </div>
                    <CardDescription>
                      Subscribed {new Date(sub.subscribedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Multiplier:</span>
                        <span className="ml-2 font-medium">{sub.quantityMultiplier}x</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Auto-Execute:</span>
                        <span className="ml-2 font-medium">{sub.autoExecuteEnabled ? 'On' : 'Off'}</span>
                      </div>
                      {sub.maxPositionSize && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Max Position:</span>
                          <span className="ml-2 font-medium">{sub.maxPositionSize} contracts</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openSettingsDialog(sub)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleUnsubscribe(sub.strategyId)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-4">
          {loadingSignals ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading signals...
              </CardContent>
            </Card>
          ) : pendingSignals?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">No pending signals. You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingSignals?.map((signal) => (
                <Card key={signal.id} className={`border-l-4 ${
                  signal.direction === 'long' ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          signal.direction === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {signal.direction === 'long' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{(signal as any).strategyName || 'Strategy'}</div>
                          <div className="text-sm text-muted-foreground">
                            {signal.action.toUpperCase()} {signal.quantity} @ ${signal.price?.toFixed(2) || 'Market'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(signal.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleSignalAction(signal.id, 'executed')}
                            disabled={updateSignalMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Executed
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSignalAction(signal.id, 'skipped')}
                            disabled={updateSignalMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Skip
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-4">
          {loadingStrategies ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading strategies...
              </CardContent>
            </Card>
          ) : unsubscribedStrategies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">You're subscribed to all available strategies!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unsubscribedStrategies.map((strategy) => (
                <Card key={strategy.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <CardDescription>{strategy.description || 'No description available'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="ml-2 font-medium">{strategy.symbol}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={strategy.active ? 'default' : 'secondary'} className="ml-2">
                          {strategy.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => openSubscribeDialog(strategy.id)}
                      disabled={!strategy.active}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to Strategy</DialogTitle>
            <DialogDescription>
              Configure your subscription settings for this strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch
                id="notifications"
                checked={subscriptionSettings.notificationsEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(s => ({ ...s, notificationsEnabled: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoExecute">Auto-Execute Trades</Label>
                <p className="text-xs text-muted-foreground">Requires connected broker</p>
              </div>
              <Switch
                id="autoExecute"
                checked={subscriptionSettings.autoExecuteEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(s => ({ ...s, autoExecuteEnabled: checked }))
                }
                disabled // Disabled until broker integration is complete
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="multiplier">Quantity Multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                min="0.1"
                step="0.1"
                value={subscriptionSettings.quantityMultiplier}
                onChange={(e) => 
                  setSubscriptionSettings(s => ({ ...s, quantityMultiplier: parseFloat(e.target.value) || 1 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Multiply signal quantity by this factor (e.g., 2 = double the contracts)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPosition">Max Position Size (optional)</Label>
              <Input
                id="maxPosition"
                type="number"
                min="1"
                placeholder="No limit"
                value={subscriptionSettings.maxPositionSize || ''}
                onChange={(e) => 
                  setSubscriptionSettings(s => ({ 
                    ...s, 
                    maxPositionSize: e.target.value ? parseInt(e.target.value) : null 
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum contracts to hold at any time
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscribe} disabled={subscribeMutation.isPending}>
              {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Settings</DialogTitle>
            <DialogDescription>
              Update your subscription settings for this strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="settings-notifications">Enable Notifications</Label>
              <Switch
                id="settings-notifications"
                checked={subscriptionSettings.notificationsEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(s => ({ ...s, notificationsEnabled: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="settings-autoExecute">Auto-Execute Trades</Label>
                <p className="text-xs text-muted-foreground">Requires connected broker</p>
              </div>
              <Switch
                id="settings-autoExecute"
                checked={subscriptionSettings.autoExecuteEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(s => ({ ...s, autoExecuteEnabled: checked }))
                }
                disabled // Disabled until broker integration is complete
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-multiplier">Quantity Multiplier</Label>
              <Input
                id="settings-multiplier"
                type="number"
                min="0.1"
                step="0.1"
                value={subscriptionSettings.quantityMultiplier}
                onChange={(e) => 
                  setSubscriptionSettings(s => ({ ...s, quantityMultiplier: parseFloat(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-maxPosition">Max Position Size (optional)</Label>
              <Input
                id="settings-maxPosition"
                type="number"
                min="1"
                placeholder="No limit"
                value={subscriptionSettings.maxPositionSize || ''}
                onChange={(e) => 
                  setSubscriptionSettings(s => ({ 
                    ...s, 
                    maxPositionSize: e.target.value ? parseInt(e.target.value) : null 
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

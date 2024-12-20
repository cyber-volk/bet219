'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TestResponse, TestUser } from "@/types"
import { toast } from 'react-toastify'

interface Transfer {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  fromUser: {
    username: string;
    role: string;
  };
  toUser: {
    username: string;
    role: string;
  };
}

export default function TestPage() {
  const [dbStatus, setDbStatus] = useState<{
    status: string;
    message?: string;
    data?: {
      users: TestUser[];
      transfers: Transfer[];
    };
    error?: string;
  } | null>(null)
  const [gameHistory, setGameHistory] = useState<TestResponse | null>(null)
  const [usersList, setUsersList] = useState<TestResponse | null>(null)
  const [transactions, setTransactions] = useState<TestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testEndpoint = async (endpoint: string, setter: (data: TestResponse) => void) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/test/${endpoint}`)
      const data = await response.json()
      setter(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const testDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test/db');
      const data = await response.json();
      
      if (response.ok) {
        setDbStatus(data);
        toast.success('Database connection successful');
      } else {
        throw new Error(data.message || 'Database test failed');
      }
    } catch (error) {
      console.error('Database test error:', error);
      toast.error(error instanceof Error ? error.message : 'Database test failed');
      setError(error instanceof Error ? error.message : 'Database test failed');
    } finally {
      setLoading(false);
    }
  };

  const testGameHistory = () => testEndpoint('game-history', setGameHistory)
  const testUsers = () => testEndpoint('users', setUsersList)
  const testTransactions = () => testEndpoint('transactions', setTransactions)

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Backend Testing Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="database">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="games">Game History</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="database" className="space-y-4">
              <Button 
                onClick={testDatabase}
                disabled={loading}
              >
                Test Database Connection
              </Button>
              {dbStatus && (
                <div className="space-y-4">
                  <div className="p-4 rounded bg-green-100 text-green-800">
                    <p className="font-bold">Status: {dbStatus.status}</p>
                    <p>Message: {dbStatus.message}</p>
                  </div>

                  {dbStatus.data && (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold">Users in Database ({dbStatus.data.users.length})</h3>
                        <div className="bg-gray-100 p-4 rounded overflow-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Username</th>
                                <th className="text-left p-2">Role</th>
                                <th className="text-left p-2">Balance</th>
                                <th className="text-left p-2">Created At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dbStatus.data.users.map((user) => (
                                <tr key={user.id} className="border-b">
                                  <td className="p-2">{user.username}</td>
                                  <td className="p-2">{user.role}</td>
                                  <td className="p-2">{user.balance} TND</td>
                                  <td className="p-2">{new Date(user.createdAt).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-bold">Recent Transfers ({dbStatus.data.transfers.length})</h3>
                        {dbStatus.data.transfers.length > 0 ? (
                          <div className="bg-gray-100 p-4 rounded overflow-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">From</th>
                                  <th className="text-left p-2">To</th>
                                  <th className="text-left p-2">Amount</th>
                                  <th className="text-left p-2">Status</th>
                                  <th className="text-left p-2">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dbStatus.data.transfers.map((transfer) => (
                                  <tr key={transfer.id} className="border-b">
                                    <td className="p-2">
                                      {transfer.fromUser ? 
                                        `${transfer.fromUser.username} (${transfer.fromUser.role})` : 
                                        'Unknown User'}
                                    </td>
                                    <td className="p-2">
                                      {transfer.toUser ? 
                                        `${transfer.toUser.username} (${transfer.toUser.role})` : 
                                        'Unknown User'}
                                    </td>
                                    <td className="p-2">{transfer.amount.toFixed(2)} TND</td>
                                    <td className="p-2">{transfer.status}</td>
                                    <td className="p-2">{new Date(transfer.createdAt).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No transfers found</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="games" className="space-y-4">
              <Button 
                onClick={testGameHistory}
                disabled={loading}
              >
                Test Game History
              </Button>
              {gameHistory?.data?.gameHistory && (
                <div className="space-y-2">
                  <h3 className="font-bold">Recent Games:</h3>
                  <div className="bg-gray-100 p-4 rounded overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Player</th>
                          <th className="text-left p-2">Game</th>
                          <th className="text-left p-2">Bet</th>
                          <th className="text-left p-2">Outcome</th>
                          <th className="text-left p-2">Win Amount</th>
                          <th className="text-left p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameHistory.data.gameHistory.map((game) => (
                          <tr key={game.id} className="border-b">
                            <td className="p-2">{game.username} ({game.userRole})</td>
                            <td className="p-2">{game.gameType}</td>
                            <td className="p-2">{game.bet} TND</td>
                            <td className="p-2">{game.outcome}</td>
                            <td className="p-2">{game.winAmount || 0} TND</td>
                            <td className="p-2">{new Date(game.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Button 
                onClick={testUsers}
                disabled={loading}
              >
                Test User Management
              </Button>
              {usersList?.data?.users && (
                <div className="space-y-2">
                  <h3 className="font-bold">User List:</h3>
                  <div className="bg-gray-100 p-4 rounded overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Username</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-left p-2">Balance</th>
                          <th className="text-left p-2">Total Games</th>
                          <th className="text-left p-2">Total Transfers</th>
                          <th className="text-left p-2">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.data.users.map((user) => (
                          <tr key={user.id} className="border-b">
                            <td className="p-2">{user.username}</td>
                            <td className="p-2">{user.role}</td>
                            <td className="p-2">{user.balance} TND</td>
                            <td className="p-2">{user.totalGames}</td>
                            <td className="p-2">{user.totalTransfers}</td>
                            <td className="p-2">{new Date(user.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Button 
                onClick={testTransactions}
                disabled={loading}
              >
                Test Transactions
              </Button>
              {transactions?.data?.transfers && (
                <div className="space-y-2">
                  <h3 className="font-bold">Recent Transactions:</h3>
                  <div className="bg-gray-100 p-4 rounded overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">From</th>
                          <th className="text-left p-2">To</th>
                          <th className="text-left p-2">Amount</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.data.transfers.map((transfer) => (
                          <tr key={transfer.id} className="border-b">
                            <td className="p-2">
                              {transfer.fromUser ? 
                                `${transfer.fromUser.username} (${transfer.fromUser.role})` : 
                                'Unknown User'}
                            </td>
                            <td className="p-2">
                              {transfer.toUser ? 
                                `${transfer.toUser.username} (${transfer.toUser.role})` : 
                                'Unknown User'}
                            </td>
                            <td className="p-2">{transfer.amount.toFixed(2)} TND</td>
                            <td className="p-2">{transfer.type}</td>
                            <td className="p-2">{transfer.status}</td>
                            <td className="p-2">{new Date(transfer.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {loading && (
            <div className="mt-4 text-center text-gray-500">
              Loading...
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

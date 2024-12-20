"use client"

import { useState, useEffect, useContext } from 'react'
import { UserContext } from '@/contexts/user-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut, Menu, User, Loader2, Globe, Search } from 'lucide-react'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { format } from 'date-fns'
import NoufiGame from '@/components/noufi-game'
import BlackjackGame from '@/components/blackjack-game'
import { v4 as uuidv4 } from 'uuid'
import { UserData, UserRole, Transaction } from '@/types'
import SimpleSlot from '@/components/simple-slot'
import { useSession, signIn, signOut } from "next-auth/react"
import ErrorBoundary from '@/components/error-boundary'

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-800 to-blue-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
        <p className="text-white text-lg">Loading...</p>
      </div>
    </div>
  );
}

export default function DashboardComponent() {
  const { data: session, status } = useSession()
  const { user, setUser, users, setUsers } = useContext(UserContext)
  const [activeSection, setActiveSection] = useState<string>('welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [gameResult, setGameResult] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    const initializeData = async () => {
      try {
        if (session?.user) {
          const [sessionResponse] = await Promise.all([
            fetch('/api/auth/session'),
          ]);

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData?.user) {
              setUser({
                id: sessionData.user.id,
                username: sessionData.user.username,
                role: sessionData.user.role,
                balance: sessionData.user.balance,
              });
              setActiveSection('dashboard');
            }
          }
        } else {
          setUser(null);
          setActiveSection('welcome');
        }
      } catch (error) {
        console.error('Initialization error:', error);
        toast.error('Failed to load initial data');
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeData();
  }, [session, status, setUser, setActiveSection]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Simulating fetching transactions
    const mockTransactions: Transaction[] = [
      {
        type: 'Transfer',
        fromUser: 'Sassoukiii (id: 723306)',
        toUser: '765567 (id: 723258)',
        amount: 20.00,
        date: new Date('2024-10-21T12:40:46'),
        note: '',
        referenceId: '19089476'
      },
      // Add more mock transactions as needed
    ];
    setTransactions(mockTransactions);
  }, []);

  useEffect(() => {
    if (user?.balance !== session?.user?.balance) {
      const updateSession = async () => {
        try {
          if (!user?.id || user?.balance === undefined) return;

          // Update the database first
          const response = await fetch('/api/users/balance', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              newBalance: user.balance,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update balance');
          }

          // Then update the session
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              balance: user.balance,
            }),
          });

          if (!sessionResponse.ok) {
            throw new Error('Failed to update session');
          }

          // Force a session refresh
          const event = new Event('visibilitychange');
          document.dispatchEvent(event);
        } catch (error) {
          console.error('Error updating balance:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to update balance');
        }
      };

      updateSession();
    }
  }, [user?.balance, session?.user?.balance, user?.id]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session?.user) {
        try {
          const response = await fetch('/api/auth/session');
          const sessionData = await response.json();
          if (sessionData?.user && sessionData.user.balance !== user?.balance) {
            setUser({
              id: sessionData.user.id,
              username: sessionData.user.username,
              role: sessionData.user.role,
              balance: sessionData.user.balance,
            });
          }
        } catch (error) {
          console.error('Session refresh error:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user, user?.balance]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        toast.success('Logged in successfully');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut()
    setUser(null)
    setActiveSection('welcome')
  }

  const playGame = async (bet: number) => {
    if (user && (user.role === 'USER' || user.role === 'ADMIN')) {
      if (user.balance <= 0 || user.balance < bet) {
        setGameResult("Insufficient balance to play.")
        return
      }

      try {
        const win = Math.random() < 0.5
        const newBalance = win ? user.balance + bet : user.balance - bet

        // Update UI immediately for responsiveness
        setUser(prev => prev ? { ...prev, balance: newBalance } : null)

        // Update backend
        const response = await fetch('/api/games/simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bet,
            outcome: win ? 'win' : 'lose',
            winAmount: win ? bet : 0,
            finalBalance: newBalance
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update balance')
        }

        const data = await response.json()

        // Update session
        await fetch('/api/auth/session', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            balance: newBalance,
          }),
        })

        setGameResult(win ? `You won ${bet} TND!` : `You lost ${bet} TND.`)
      } catch (error) {
        console.error('Error updating balance:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to update balance')
        // Revert balance on error
        setUser(prev => prev ? { ...prev, balance: user.balance } : null)
      }
    }
  }

  const renderContent = () => {
    if (!session?.user) {
      return <WelcomeSection />;
    }

    switch (activeSection) {
      case 'welcome':
        return <WelcomeSection />;
      case 'dashboard':
        return user?.role === 'ADMIN' ? <AdminDashboard /> : 
               user?.role === 'AGENT' ? <AgentDashboard /> :
               <UserDashboard balance={user?.balance || 0} playGame={playGame} gameResult={gameResult} />;
      case '21':
        return user ? <Game21 /> : <div>Please log in to play</div>;
      case '9':
        return user ? <Game9 /> : <div>Please log in to play</div>;
      case 'casino':
        return user ? <CasinoSection /> : <div>Please log in to play</div>;
      case 'users':
        return <UsersSection userRole={user?.role || null} />;
      case 'agents':
        return <AgentsSection />;
      case 'transactions':
        return <TransactionsSection 
          transactions={transactions}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          dateRange={dateRange}
          setDateRange={setDateRange}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />;
      case 'transferHistory':
        return <TransferHistorySection />;
      case 'changePassword':
        return <ChangePasswordSection />;
      case 'createUser':
        return <CreateUserSection />;
      case 'transfer':
        return <TransferSection />;
      default:
        return <div>Section not found</div>;
    }
  };

  const _createUser = (username: string, role: UserRole, initialBalance: number) => {
    const newUser: UserData = {
      id: uuidv4(),
      username,
      role,
      balance: initialBalance
    };
    setUsers([...users, newUser]);
    toast.success(`User ${username} created successfully`);
  };

  const navigateToGame = (game: string) => {
    if (!session?.user) {
      toast.error('Please log in to play');
      return;
    }
    setActiveSection(game);
  };

  if (status === "loading" || isInitialLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <nav className="bg-blue-900 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold ml-4">219bet</h1>
          </div>
          <div className="hidden md:flex space-x-4">
            {session?.user && (
              <>
                <Button variant="ghost" onClick={() => navigateToGame('casino')}>Casino</Button>
                <Button variant="ghost" onClick={() => navigateToGame('21')}>21</Button>
                <Button variant="ghost" onClick={() => navigateToGame('9')}>9</Button>
                {(session.user.role === 'ADMIN' || session.user.role === 'AGENT') && (
                  <Button variant="ghost" onClick={() => setActiveSection('transfer')}>Transfer</Button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {status === "authenticated" && session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white">
                    <User className="mr-2 h-4 w-4" />
                    {session.user.username}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    Balance: {user?.balance ? user.balance.toFixed(2) : '0.00'} TND
                    {user?.balance !== undefined && user.balance <= 0 && (
                      <span className="text-red-500 ml-2">
                        (Refund required to play)
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setActiveSection('changePassword')}>
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setActiveSection('transferHistory')}>
                    Transfer History
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : status === "unauthenticated" ? (
              <form onSubmit={login} className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-blue-800 border-blue-700 text-white placeholder-blue-300"
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-blue-800 border-blue-700 text-white placeholder-blue-300"
                  required
                />
                <Button type="submit" variant="ghost" className="bg-blue-800 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
                </Button>
              </form>
            ) : null}
            <Select defaultValue="fr">
              <SelectTrigger className="w-[40px] bg-blue-800 border-blue-700">
                <Globe className="h-4 w-4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">FR</SelectItem>
                <SelectItem value="en">EN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </nav>
      <div className="flex flex-1 relative">
        {(isSidebarOpen || !isMobile) && session?.user && (
          <aside className={`${isMobile ? 'absolute z-10 left-0 top-0 h-full' : 'relative'} w-64 bg-blue-800 text-white p-4 shadow-md transition-all duration-300 ease-in-out`}>
            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('dashboard')}>Dashboard</Button>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => navigateToGame('casino')}>Casino</Button>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => navigateToGame('21')}>21 Game</Button>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => navigateToGame('9')}>9 Game</Button>
              {session.user.role === 'ADMIN' && (
                <>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('agents')}>Agents</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('users')}>Users</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('transactions')}>Transactions</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('createUser')}>Create User</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('transfer')}>Balance Transfer</Button>
                </>
              )}
              {session.user.role === 'AGENT' && (
                <>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('users')}>Users</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('transactions')}>Transactions</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('createUser')}>Create User</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('transfer')}>Balance Transfer</Button>
                </>
              )}
              {session.user.role === 'USER' && (
                <>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('transferHistory')}>Transfer History</Button>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-700" onClick={() => setActiveSection('changePassword')}>Change Password</Button>
                </>
              )}
            </nav>
          </aside>
        )}
        <main className={`flex-1 p-4 md:p-8 ${isMobile && isSidebarOpen ? 'ml-64' : ''}`}>
          
          {renderContent()}
        </main>
      </div>
      <footer className="bg-blue-900 text-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">219bet</h3>
              <p className="text-sm">Your premier destination for online betting with friends.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-300">Home</a></li>
                <li><a href="#" className="hover:text-blue-300">Games</a></li>
                <li><a href="#" className="hover:text-blue-300">About Us</a></li>
                <li><a href="#" className="hover:text-blue-300">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-300">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-300">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-300">Responsible Gaming</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <p className="text-sm mb-2">Need help? Contact us at:</p>
              <p className="text-sm">support@219bet.com</p>
              <p className="text-sm">+1 (555) 123-4567</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-blue-800 text-center">
            <p>&copy; 2024 219bet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function WelcomeSection() {
  return (
    <div className="text-center text-white">
      <h1 className="text-4xl font-bold mb-4">Welcome to 219bet</h1>
      <p className="text-xl">Your premier destination for online betting with friends.</p>
    </div>
  )
}

function AdminDashboard() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Admin Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Total Users: <span className="font-bold">1,234</span></p>
              <p className="text-lg">Active Users: <span className="font-bold">987</span></p>
              <p className="text-lg">New Users (Last 7 Days): <span className="font-bold">56</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Total Balance: <span className="font-bold">50,000 TND</span></p>
              <p className="text-lg">Total Bets: <span className="font-bold">30,000 TND</span></p>
              <p className="text-lg">Total Winnings: <span className="font-bold">25,000 TND</span></p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

function AgentDashboard() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Agent Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Total Users: <span className="font-bold">500</span></p>
              <p className="text-lg">Active Users: <span className="font-bold">450</span></p>
              <p className="text-lg">New Users (Last 7 Days): <span className="font-bold">25</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Total User Balance: <span className="font-bold">25,000 TND</span></p>
              <p className="text-lg">Total Bets: <span className="font-bold">15,000 TND</span></p>
              <p className="text-lg">Total Winnings: <span className="font-bold">12,000 TND</span></p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

function UserDashboard({ balance, playGame, gameResult }: { balance: number, playGame: (bet: number) => void, gameResult: string }) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>User Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 mt-6">
          <p className="text-xl">Your current balance: <span className="font-bold">{balance.toFixed(2)} TND</span></p>
          <p className="text-lg">Place your bet and try your luck!</p>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => playGame(5)} disabled={balance < 5} className="bg-blue-900 hover:bg-blue-800">Bet 5 TND</Button>
            <Button onClick={() => playGame(10)} disabled={balance < 10} className="bg-blue-900 hover:bg-blue-800">Bet 10 TND</Button>
            <Button onClick={() => playGame(20)} disabled={balance < 20} className="bg-blue-900 hover:bg-blue-800">Bet 20 TND</Button>
          </div>
          {gameResult && <p className="mt-4 text-xl font-bold">{gameResult}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function UsersSection({ userRole }: { userRole: UserRole | null }) {
  const [users, setUsers] = useState<UserData[]>([
    { id: uuidv4(), username: 'john_doe', role: 'USER', balance: 100 },
    { id: uuidv4(), username: 'jane_smith', role: 'USER', balance: 250 },
  ]);
  
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const deleteUser = (userId: string) => {
    if (userRole === 'ADMIN') {
      setUsers(users.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } else {
      toast.error('Only admins can delete users');
    }
  };

  const showBalance = (user: UserData) => {
    setSelectedUser(user);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 mt-6">
          <Input type="search" placeholder="Search users..." className="max-w-md" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => showBalance(user)} className="mr-2">Show Balance</Button>
                    {userRole === 'ADMIN' && (
                      <Button variant="destructive" size="sm" onClick={() => deleteUser(user.id.toString())}>Delete</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {selectedUser && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{selectedUser.username}'s Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Balance: <span className="font-bold">{selectedUser.balance.toFixed(2)} TND</span></p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}

function AgentsSection() {
  const [agents, setAgents] = useState([
    { id: uuidv4(), username: 'agent1', balance: 1000 },
    { id: uuidv4(), username: 'agent2', balance: 1500 },
    // Add more mock agents as needed
  ]);

  const deleteAgent = (agentId: string) => {
    setAgents(agents.filter(agent => agent.id !== agentId));
    toast.success('Agent deleted successfully');
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Agent Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 mt-6">
          <Input type="search" placeholder="Search agents..." className="max-w-md" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>{agent.username}</TableCell>
                  <TableCell>{agent.balance.toFixed(2)} TND</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deleteAgent(agent.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionsSection({ 
  transactions, 
  selectedUser, 
  setSelectedUser, 
  dateRange, 
  setDateRange, 
  searchTerm, 
  setSearchTerm 
}: {
  transactions: Transaction[];
  selectedUser: string;
  setSelectedUser: (user: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) {
  const generateReport = () => {
    // Implement report generation logic
    console.log("Generating report...");
  };

  const resetFilters = () => {
    setSelectedUser('');
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>TRANSACTIONS FINANCIÈRES</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 mt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label htmlFor="quickFilter">Sélectionnez un Filtre rapide</Label>
              <Select>
                <SelectTrigger id="quickFilter">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="yesterday">Hier</SelectItem>
                  <SelectItem value="thisWeek">Cette semaine</SelectItem>
                  <SelectItem value="thisMonth">Ce mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fromDate">DE</Label>
              <Input 
                id="fromDate" 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="toDate">A</Label>
              <Input 
                id="toDate" 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-grow">
              <Label htmlFor="userSelect">Sélectionner un utilisateur</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="userSelect">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sassoukiii [User]">Sassoukiii [User]</SelectItem>
                  {/* Add more users as needed */}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport}>Generate Report</Button>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From user</TableHead>
                <TableHead>To user</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date and time</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Reference ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.fromUser}</TableCell>
                  <TableCell>{transaction.toUser}</TableCell>
                  <TableCell>{transaction.amount.toFixed(2)} TND</TableCell>
                  <TableCell>{format(transaction.date, 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                  <TableCell>{transaction.note}</TableCell>
                  <TableCell>{transaction.referenceId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function TransferHistorySection() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Transfer History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>2024-10-21</TableCell>
              <TableCell>Deposit</TableCell>
              <TableCell>100.00 TND</TableCell>
              <TableCell>Completed</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>2024-10-20</TableCell>
              <TableCell>Withdrawal</TableCell>
              <TableCell>50.00 TND</TableCell>
              <TableCell>Pending</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ChangePasswordSection() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6 mt-6">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" required />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" required />
          </div>
          <div>
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input id="confirmNewPassword" type="password" required />
          </div>
          <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800">Change Password</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CreateUserSection() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
    initialBalance: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { newUsername, newPassword, confirmPassword, initialBalance } = formData;

      if (newPassword !== confirmPassword) {
        throw new Error("Passwords don't match");
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          initialBalance: parseFloat(initialBalance),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success(`User ${newUsername} created successfully`);
      
      // Reset form
      setFormData({
        newUsername: '',
        newPassword: '',
        confirmPassword: '',
        initialBalance: '',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
    setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div>
            <Label htmlFor="newUsername">Username</Label>
            <Input 
              id="newUsername" 
              name="newUsername" 
              value={formData.newUsername}
              onChange={handleChange}
              required 
            />
          </div>
          <div>
            <Label htmlFor="initialBalance">Initial Balance</Label>
            <Input 
              id="initialBalance" 
              name="initialBalance" 
              type="number" 
              step="0.01" 
              value={formData.initialBalance}
              onChange={handleChange}
              required 
              min="0"
              max={user?.balance || 0}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">Password</Label>
            <Input 
              id="newPassword" 
              name="newPassword" 
              type="password" 
              value={formData.newPassword}
              onChange={handleChange}
              required 
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-blue-900 hover:bg-blue-800" 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Create User'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TransferSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [fromUser, setFromUser] = useState<string>('')
  const [fromUserData, setFromUserData] = useState<UserData | null>(null)
  const [toUser, setToUser] = useState<string>('')
  const [toUserData, setToUserData] = useState<UserData | null>(null)
  const [amount, setAmount] = useState('')
  const [fromSearchTerm, setFromSearchTerm] = useState('')
  const [toSearchTerm, setToSearchTerm] = useState('')
  const [fromSearchResults, setFromSearchResults] = useState<UserData[]>([])
  const [toSearchResults, setToSearchResults] = useState<UserData[]>([])

  // Handle source user search
  useEffect(() => {
    const searchSourceUsers = async () => {
      if (fromSearchTerm.length > 0) {
        try {
          const response = await fetch(`/api/users/search?term=${fromSearchTerm}&source=true`)
          if (response.ok) {
            const data = await response.json()
            setFromSearchResults(data.users)
          }
        } catch (error) {
          console.error('Error searching source users:', error)
          toast.error('Failed to search users')
        }
      } else {
        setFromSearchResults([])
      }
    }

    const debounce = setTimeout(searchSourceUsers, 300)
    return () => clearTimeout(debounce)
  }, [fromSearchTerm])

  // Handle destination user search
  useEffect(() => {
    const searchDestUsers = async () => {
      if (toSearchTerm.length > 0) {
        try {
          const response = await fetch(`/api/users/search?term=${toSearchTerm}`)
          if (response.ok) {
            const data = await response.json()
            setToSearchResults(data.users)
          }
        } catch (error) {
          console.error('Error searching users:', error)
          toast.error('Failed to search users')
        }
      } else {
        setToSearchResults([])
      }
    }

    const debounce = setTimeout(searchDestUsers, 300)
    return () => clearTimeout(debounce)
  }, [toSearchTerm])

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!fromUser || !toUser || !amount) {
        throw new Error('Please fill in all fields')
      }

      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: fromUser,
          toUserId: toUser,
          amount: parseFloat(amount),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Transfer failed')
      }

      const data = await response.json()
      toast.success('Transfer completed successfully')
      
      // Reset form
      setToUser('')
      setToUserData(null)
      setFromUser('')
      setFromUserData(null)
      setAmount('')
      setFromSearchTerm('')
      setToSearchTerm('')
    } catch (error) {
      console.error('Transfer error:', error)
      toast.error(error instanceof Error ? error.message : 'Transfer failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Balance Transfer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTransfer} className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From User Search */}
            <div>
              <Label htmlFor="fromUser">From User</Label>
              <div className="space-y-2">
                <Input 
                  type="text" 
                  placeholder="Search source user..." 
                  value={fromSearchTerm} 
                  onChange={(e) => setFromSearchTerm(e.target.value)}
                />
                {fromSearchResults.length > 0 && (
                  <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-auto">
                    <CardContent className="p-0">
                      {fromSearchResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setFromUser(result.id.toString())
                            setFromUserData(result)
                            setFromSearchTerm(result.username)
                            setFromSearchResults([])
                          }}
                        >
                          {result.username} ({result.role})
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              {fromUserData && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {fromUserData.username} ({fromUserData.role})
                </p>
              )}
            </div>

            {/* To User Search */}
            <div>
              <Label htmlFor="toUser">To User</Label>
              <div className="space-y-2">
                <Input 
                  type="text" 
                  placeholder="Search destination user..." 
                  value={toSearchTerm} 
                  onChange={(e) => setToSearchTerm(e.target.value)}
                />
                {toSearchResults.length > 0 && (
                  <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-auto">
                    <CardContent className="p-0">
                      {toSearchResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setToUser(result.id.toString())
                            setToUserData(result)
                            setToSearchTerm(result.username)
                            setToSearchResults([])
                          }}
                        >
                          {result.username} ({result.role})
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              {toUserData && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {toUserData.username} ({toUserData.role})
                </p>
              )}
            </div>
          </div>

          {/* Amount input and submit button */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01" 
              required 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-blue-900 hover:bg-blue-800" 
            disabled={isLoading || !fromUser || !toUser || !amount}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Transfer'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Game21() {
  return (
    <ErrorBoundary>
      <BlackjackGame />
    </ErrorBoundary>
  );
}

function Game9() {
  return (
    <ErrorBoundary>
      <NoufiGame />
    </ErrorBoundary>
  );
}

function CasinoSection() {
  const { user, balance } = useContext(UserContext);

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-900 text-white">
        <CardTitle>Casino Games</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <SimpleSlot />
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold">Current Balance: {balance.toFixed(2)} TND</p>
            {!user && (
              <p className="text-sm text-gray-500 mt-2">Please log in to play with real balance.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

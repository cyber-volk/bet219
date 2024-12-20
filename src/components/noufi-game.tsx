"use client"

import React, { useState, useEffect, useContext, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, RefreshCcw, Play, Repeat } from 'lucide-react'
import { UserContext } from '@/contexts/user-context'
import { NoufiCard, NoufiHand, NoufiValue } from '@/types'
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

// Types
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type GameState = 'betting' | 'playing' | 'dealerTurn' | 'gameOver'

interface Player {
  hand: NoufiHand
  bet: number
  status: 'betting' | 'playing' | 'done' | 'win' | 'lose' | 'push'
  score: number
  revealed: boolean
}

// Utility functions
function createDeck(): NoufiHand {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const values: NoufiValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  const deck: NoufiHand = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value })
    }
  }

  return deck
}

function shuffleDeck(deck: NoufiHand): NoufiHand {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function dealCard(deck: NoufiHand, setDeck: React.Dispatch<React.SetStateAction<NoufiHand>>): NoufiCard | undefined {
  if (deck.length <= 10) {
    console.log('Reshuffling deck...');
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck);
    return newDeck.pop();
  }
  return deck.pop();
}

function calculateHandValue(hand: NoufiHand): number {
  const value = hand.reduce((sum, card) => {
    if (['8', '9', '10'].includes(card.value)) {
      return sum
    }
    return sum + parseInt(card.value)
  }, 0)
  return value % 10
}

function _isHchich(hand: NoufiHand): boolean {
  return hand.every(card => ['8', '9', '10'].includes(card.value))
}

// Card component
function CardComponent({ card, faceUp, index }: { card: NoufiCard; faceUp: boolean; index: number }) {
  const { suit, value } = card

  if (!faceUp) {
    return (
      <div className="absolute w-12 h-18 md:w-16 md:h-24 bg-blue-600 rounded-lg border-2 border-white shadow-lg transform hover:scale-105 transition-transform" style={{ left: `${index * 25}px`, top: `${index * 5}px`, zIndex: index }}>
        <div className="w-full h-full flex items-center justify-center text-white text-xl md:text-2xl font-bold">
          ♠♥♣♦
        </div>
      </div>
    )
  }

  const suitSymbol = {
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    spades: '♠️',
  }[suit]

  const color = suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black'

  let displayValue: string = value
  if (value === '8') displayValue = 'J'
  if (value === '9') displayValue = 'Q'
  if (value === '10') displayValue = 'K'

  return (
    <div className={`absolute w-12 h-18 md:w-16 md:h-24 bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col justify-between p-1 md:p-2 ${color} transform hover:scale-105 transition-transform`} style={{ left: `${index * 25}px`, top: `${index * 5}px`, zIndex: index }}>
      <div className="text-left text-sm md:text-lg font-bold">{displayValue}</div>
      <div className="text-center text-xl md:text-3xl">{suitSymbol}</div>
      <div className="text-right text-sm md:text-lg font-bold transform rotate-180">{displayValue}</div>
    </div>
  )
}

// ChipStack component
function ChipStack({ onChipClick, selectedChip }: { onChipClick: (amount: number) => void, selectedChip: number }) {
  const chips = [1, 5, 10, 25, 100]

  return (
    <div className="flex justify-center gap-1 md:gap-2">
      {chips.map((amount) => (
        <Button
          key={amount}
          onClick={() => onChipClick(amount)}
          variant={selectedChip === amount ? "secondary" : "outline"}
          className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs font-bold ${selectedChip === amount ? 'ring-2 ring-yellow-400' : ''}`}
          style={{
            backgroundColor: 
              amount === 1 ? '#FFFFFF' : 
              amount === 5 ? '#FF0000' : 
              amount === 10 ? '#0000FF' :
              amount === 25 ? '#008000' : 
              '#000000',
            color: amount === 1 ? '#000000' : '#FFFFFF',
          }}
        >
          ${amount}
        </Button>
      ))}
    </div>
  )
}

// Main NoufiGame component
export default function NoufiGame() {
  const { balance, updateBalance, canBet } = useContext(UserContext)
  const { data: session } = useSession()
  const router = useRouter()
  const [deck, setDeck] = useState<NoufiHand>([])
  const [players, setPlayers] = useState<Player[]>([
    { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
    { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
    { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
    { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
  ])
  const [dealer, setDealer] = useState<Player>({ hand: [], bet: 0, status: 'playing', score: 0, revealed: false })
  const [gameState, setGameState] = useState<GameState>('betting');
  const [message, setMessage] = useState<string>('')
  const [selectedChip, setSelectedChip] = useState<number>(1)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0)
  const [previousBets, setPreviousBets] = useState<number[]>([0, 0, 0, 0])

  // Add state for game persistence
  const [_savedGameState, setSavedGameState] = useState<{
    players: Player[];
    dealer: Player;
    deck: NoufiHand;
    bets: number[];
    currentPlayerIndex: number;
  } | null>(null)

  // Load saved game state on mount
  useEffect(() => {
    const loadSavedGame = async () => {
      if (!session?.user?.id) return;
      
      try {
        const savedGame = localStorage.getItem(`noufi_game_${session.user.id}`);
        if (savedGame) {
          const parsedGame = JSON.parse(savedGame);
          setSavedGameState(parsedGame);
          
          // Ask user if they want to restore the game
          if (window.confirm('Would you like to restore your previous game?')) {
            setPlayers(parsedGame.players);
            setDealer(parsedGame.dealer);
            setDeck(parsedGame.deck);
            setCurrentPlayerIndex(parsedGame.currentPlayerIndex);
            setGameState('playing');
          } else {
            // Clear saved game if user doesn't want to restore
            localStorage.removeItem(`noufi_game_${session.user.id}`);
          }
        }
      } catch (error) {
        console.error('Error loading saved game:', error);
      }
    };

    loadSavedGame();
  }, [session?.user?.id, currentPlayerIndex, dealer, deck, players]);

  // Save game state when important changes occur
  useEffect(() => {
    if (!session?.user?.id || gameState === 'betting' || gameState === 'gameOver') {
      return;
    }

    const gameStateToSave = {
      players,
      dealer,
      deck,
      gameState
    };

    localStorage.setItem(
      `noufi_game_${session.user.id}`,
      JSON.stringify(gameStateToSave)
    );
  }, [players, dealer, deck, gameState, session?.user?.id]);

  // Clear saved game when game ends normally
  useEffect(() => {
    if (gameState === 'gameOver' && session?.user?.id) {
      localStorage.removeItem(`noufi_game_${session.user.id}`);
    }
  }, [gameState, session?.user?.id]);

  // Prevent unwanted redirects
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user && gameState !== 'betting') {
      // Save game state before redirect
      if (session?.user?.id) {
        const gameStateToSave = {
          players,
          dealer,
          deck,
          currentPlayerIndex,
          gameState
        };
        localStorage.setItem(
          `noufi_game_${session.user.id}`,
          JSON.stringify(gameStateToSave)
        );
      }
    }
  }, [session, status, gameState]);

  useEffect(() => {
    resetGame()
  }, [])

  // Update the session effect
  useEffect(() => {
    if (status === "loading") return;
    
    // Only redirect if there's absolutely no session
    if (!session?.user) {
      router.push('/')
      return
    }

    // Don't refresh session during active gameplay
    if (gameState === 'playing' || gameState === 'dealerTurn') {
      return;
    }

    const refreshSession = async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/auth/session`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to refresh session');
        }
        
        const data = await response.json();
        if (!data?.user) {
          throw new Error('No user in session');
        }
        
        if (data.user.balance !== balance) {
          updateBalance(data.user.balance);
        }
      } catch (error) {
        console.error('Session refresh error:', error);
        // Only redirect if we're in a safe state
        if (gameState === 'betting' || gameState === 'gameOver') {
          router.push('/');
        }
      }
    };

    // Only refresh session at appropriate times
    if (gameState === 'betting' || gameState === 'gameOver') {
      refreshSession();
    }
  }, [session, status, balance, gameState, updateBalance]);

  // Add this effect to maintain session during gameplay
  useEffect(() => {
    if (!session?.user?.id || gameState === 'betting' || gameState === 'gameOver') {
      return;
    }

    const keepSessionAlive = setInterval(async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/auth/session`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('Failed to keep session alive');
        }
      } catch (error) {
        console.error('Session keep-alive error:', error);
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(keepSessionAlive);
  }, [session?.user?.id, gameState]);

  // Update the deal function
  const deal = async () => {
    if (!session?.user) {
      setMessage("Please log in to play");
      router.push('/');
      return;
    }

    const totalBet = players.reduce((sum, player) => sum + player.bet, 0)
    if (totalBet > 0) {
      if (!canBet(totalBet)) {
        setMessage("Insufficient balance to place these bets.")
        return
      }

      try {
        // Clear any saved game state before starting new game
        if (session?.user?.id) {
          localStorage.removeItem(`noufi_game_${session.user.id}`);
        }

        // Update balance immediately for UI responsiveness
        const newBalance = balance - totalBet
        updateBalance(newBalance)

        // Record game start
        const response = await fetch(`${window.location.origin}/api/games/noufi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bet: totalBet,
            action: 'deal',
            finalBalance: newBalance
          })
        })

        if (!response.ok) {
          throw new Error('Failed to process game')
        }

        // Continue with game logic
        const newDeck = shuffleDeck(createDeck())
        const newPlayers = players.map(player => ({
          ...player,
          hand: [] as NoufiHand,
          status: player.bet > 0 ? 'playing' : 'done' as 'betting' | 'playing' | 'done' | 'win' | 'lose' | 'push',
          revealed: false,
          score: 0,
        }))
        const newDealer = { ...dealer, hand: [] as NoufiHand, revealed: false, score: 0 }

        for (let i = 0; i < 3; i++) {
          newPlayers.forEach((player, _index) => {
            if (player.status === 'playing') {
              const card = dealCard(newDeck, setDeck)
              if (card) player.hand.push(card)
            }
          })
          const dealerCard = dealCard(newDeck, setDeck)
          if (dealerCard) newDealer.hand.push(dealerCard)
        }

        setDeck(newDeck)
        setPlayers(newPlayers)
        setDealer(newDealer)
        setGameState('playing')
        setCurrentPlayerIndex(newPlayers.findIndex(player => player.status === 'playing'))
        setPreviousBets(newPlayers.map(player => player.bet))

      } catch (error) {
        console.error('Game error:', error)
        setMessage("An error occurred while processing the game.")
        // Revert balance on error
        updateBalance(balance)
      }
    } else {
      setMessage("At least one player must have a bet before dealing.")
    }
  }

  const _show = (playerIndex: number) => {
    const newPlayers = [...players]
    newPlayers[playerIndex].revealed = true
    newPlayers[playerIndex].score = calculateHandValue(newPlayers[playerIndex].hand)
    newPlayers[playerIndex].status = 'done'
    setPlayers(newPlayers)

    if (playerIndex === 0) {
      const newDealer = { ...dealer, revealed: true, score: calculateHandValue(dealer.hand) }
      setDealer(newDealer)
    }

    moveToNextPlayer()
  }

  const moveToNextPlayer = () => {
    const nextPlayerIndex = players.findIndex((player, _index) => 
      _index > currentPlayerIndex && player.status === 'playing'
    )
    if (nextPlayerIndex === -1) {
      setGameState('dealerTurn')
      resolveRound()
    } else {
      setCurrentPlayerIndex(nextPlayerIndex)
    }
  }

  const resolveRound = async () => {
    if (!session?.user) {
      setMessage("Session expired. Please log in again.");
      return;
    }

    try {
      const newPlayers = [...players];
      let totalWinnings = 0;

      newPlayers.forEach((player, _index) => {
        if (player.status === 'playing' || player.status === 'done') {
          if (player.score > dealer.score) {
            player.status = 'win'
            totalWinnings += player.bet * 2
          } else if (player.score < dealer.score) {
            player.status = 'lose'
          } else {
            player.status = 'push'
            totalWinnings += player.bet
          }
        }
      });

      // Update balance immediately for UI responsiveness
      const newBalance = balance + totalWinnings;
      updateBalance(newBalance);

      // Record game result - Add the total bet amount here
      const totalBet = newPlayers.reduce((sum, player) => sum + player.bet, 0);
      const response = await fetch(`${window.location.origin}/api/games/noufi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          bet: totalBet,
          winAmount: totalWinnings,
          finalBalance: newBalance
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process game result')
      }

      const result = await response.json()
      
      // Update the balance from the server response
      if (result.balance !== undefined) {
        updateBalance(result.balance)
      }

      setPlayers(newPlayers)
      setGameState('gameOver')
      setMessage(`Round Over! Total winnings: ${totalWinnings.toFixed(2)} TND`)

    } catch (error) {
      console.error('Game error:', error)
      setMessage("An error occurred while processing the game result.")
    }
  }

  const repeatBets = () => {
    resetGame() // Reset the game state before repeating bets
    const newPlayers = players.map((player, index) => ({
      ...player,
      bet: previousBets[index],
    }))
    setPlayers(newPlayers)
    deal() // Call deal function after setting the bets
  }

  const renderHand = (hand: NoufiHand, score: number, isDealer: boolean, _index: number, revealed: boolean) => {
    return (
      <Card className="w-full bg-green-800 border-2 border-yellow-600">
        <CardContent className="p-2 md:p-4">
          <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-4">
            {isDealer ? "Dealer" : `Player ${_index + 1}`}
          </h3>
          <div className="relative h-28 md:h-36 mb-2 md:mb-4">
            {hand.map((card, index) => (
              <motion.div
                key={`${isDealer ? 'dealer' : `player-${_index}`}-${card.suit}-${card.value}-${index}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardComponent 
                  card={card} 
                  faceUp={isDealer ? (revealed || index === 0) : revealed} 
                  index={index} 
                />
              </motion.div>
            ))}
          </div>
          <div className="text-center text-white text-lg font-bold mb-1 md:mb-2">
            {revealed ? `Score: ${score}` : 'Score: ?'}
          </div>
          {/* Rest of the render function... */}
        </CardContent>
      </Card>
    );
  };

  const resetGame = useCallback(() => {
    if (!session?.user) return; // Don't reset if no session
    
    const newDeck = shuffleDeck(createDeck())
    setDeck(newDeck)
    setPlayers([
      { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
      { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
      { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
      { hand: [], bet: 0, status: 'betting', score: 0, revealed: false },
    ])
    setDealer({ hand: [], bet: 0, status: 'playing', score: 0, revealed: false })
    setGameState('betting')
    setMessage('')
    setCurrentPlayerIndex(0)
  }, [session?.user]);

  const _placeBet = (playerIndex: number) => {
    const betAmount = selectedChip
    if (!canBet(players[playerIndex].bet + betAmount)) {
      setMessage("Insufficient balance for this bet.")
    } else {
      const newPlayers = [...players]
      newPlayers[playerIndex].bet += betAmount
      setPlayers(newPlayers)
      setMessage("")
    }
  }

  const _clearBet = (playerIndex: number) => {
    const newPlayers = [...players]
    newPlayers[playerIndex].bet = 0
    setPlayers(newPlayers)
  }

  const _undoBet = (playerIndex: number) => {
    const newPlayers = [...players]
    if (newPlayers[playerIndex].bet >= selectedChip) {
      newPlayers[playerIndex].bet -= selectedChip
      setPlayers(newPlayers)
    }
  }

  const betAll = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const newPlayers = [...players]
    newPlayers.forEach((player) => {
      if (canBet(player.bet + selectedChip)) {
        player.bet += selectedChip
      }
    })
    setPlayers(newPlayers)
  }

  const clearAll = () => {
    const newPlayers = players.map(player => ({ ...player, bet: 0 }))
    setPlayers(newPlayers)
  }

  // Add this effect to prevent unwanted navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState === 'playing' || gameState === 'dealerTurn') {
        resetGame();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState, resetGame]);

  // Add this effect to handle navigation attempts
  useEffect(() => {
    const handlePopState = (_e: PopStateEvent) => {
      if (gameState === 'playing' || gameState === 'dealerTurn') {
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [gameState]);

  // Add saveGameState function
  const saveGameState = useCallback((gameStateData: {
    currentPlayerIndex: number;
    dealer: Player;
    deck: NoufiHand;
    players: Player[];
  }) => {
    if (!session?.user?.id) return;
    
    const gameState = {
      players: gameStateData.players,
      dealer: gameStateData.dealer,
      deck: gameStateData.deck,
      currentPlayerIndex: gameStateData.currentPlayerIndex,
    };
    
    localStorage.setItem(`noufi_game_${session.user.id}`, JSON.stringify(gameState));
  }, [session?.user?.id]);

  // Update the useEffect that uses saveGameState
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'dealerTurn') {
      const gameStateData = {
        currentPlayerIndex,
        dealer,
        deck,
        players,
      };
      saveGameState(gameStateData);
    }
  }, [gameState, currentPlayerIndex, dealer, deck, players, saveGameState]);

  // Add proper dependency array to the navigation effect
  useEffect(() => {
    if (!session?.user) {
      router.push('/');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-green-800 border-2 border-yellow-600 mb-4 md:mb-6">
          <CardContent className="p-2 md:p-4">
            <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-1 md:mb-2">Noufi</h1>
            <p className="text-center text-sm md:text-lg text-yellow-400 font-semibold">
              9 is the best hand!
            </p>
          </CardContent>
        </Card>
        
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-4">
          {/* Dealer's area */}
          <div className="md:col-span-4">
            {renderHand(dealer.hand, dealer.score, true, -1, dealer.revealed)}
          </div>

          {/* Players' hands */}
          {players.map((player, _index) => (
            <div key={_index} className={`${_index === currentPlayerIndex && gameState === 'playing' ? 'ring-4 ring-yellow-400 rounded-lg' : ''}`}>
              {renderHand(player.hand, player.score, false, _index, player.revealed)}
            </div>
          ))}
        </div>

        {/* Game controls and betting chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mt-4 md:mt-6">
          <div className="flex-grow-0">
            <ChipStack onChipClick={(amount) => setSelectedChip(amount)} selectedChip={selectedChip} />
          </div>
          <div className="flex flex-wrap gap-2">
            {gameState === 'betting' && (
              <>
                <Button onClick={betAll} variant="secondary" size="sm" className="text-xs md:text-sm">
                  <Coins className="w-3 h-3 md:w-4 md:h-4 mr-1" />Bet All
                </Button>
                <Button onClick={clearAll} variant="destructive" size="sm" className="text-xs md:text-sm">
                  <RefreshCcw className="w-3 h-3 md:w-4 md:h-4 mr-1" />Clear All
                </Button>
                <Button onClick={deal} disabled={players.every(player => player.bet === 0)} size="sm" className="text-xs md:text-sm">
                  <Play className="w-3 h-3 md:w-4 md:h-4 mr-1" />Deal
                </Button>
              </>
            )}
            {gameState === 'gameOver' && (
              <>
                <Button onClick={repeatBets} variant="secondary" size="sm" className="text-xs md:text-sm">
                  <Repeat className="w-3 h-3 md:w-4 md:h-4 mr-1" />Repeat
                </Button>
                <Button onClick={resetGame} variant="secondary" size="sm" className="text-xs md:text-sm">
                  <RefreshCcw className="w-3 h-3 md:w-4 md:h-4 mr-1" />New Round
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Message display */}
        <Card className="mt-4 md:mt-6 bg-green-800 border-2 border-yellow-600">
          <CardContent className="p-2 md:p-4">
            <p className="text-center text-sm md:text-lg text-yellow-400 font-semibold">
              {message}
            </p>
          </CardContent>
        </Card>

        {/* Balance and total bet display */}
        <Card className="mt-4 md:mt-6 bg-green-800 border-2 border-yellow-600">
          <CardContent className="p-2 md:p-4">
            <div className="text-white text-center text-sm md:text-lg">
              <p className="font-bold">Balance: ${balance}</p>
              <p>Total Bet: ${players.reduce((sum, player) => sum + player.bet, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, RefreshCcw, Play, Plus, Minus, HandMetal, SplitSquareVertical, Repeat } from 'lucide-react'
import { UserContext } from '@/contexts/user-context'
import { BlackjackHand as Hand, BlackjackPlayer as Player, BlackjackCard } from '@/types'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Utility functions
function createDeck(): Hand {
  const suits: ('hearts' | 'diamonds' | 'clubs' | 'spades')[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const values: ('A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K')[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Hand = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value })
    }
  }

  return deck
}

function shuffleDeck(deck: Hand): Hand {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function dealCard(deck: Hand, setDeck: React.Dispatch<React.SetStateAction<Hand>>): BlackjackCard | undefined {
  if (deck.length <= 15) {
    console.log('Reshuffling deck...');
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck);
    return newDeck.pop();
  }
  return deck.pop();
}

function calculateHandValue(hand: Hand): number {
  let value = 0
  let aces = 0

  for (const card of hand) {
    if (!card) continue;

    if (card.value === 'A') {
      aces++
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      value += 10
    } else {
      value += parseInt(card.value)
    }
  }

  for (let i = 0; i < aces; i++) {
    if (value + 11 <= 21) {
      value += 11
    } else {
      value += 1
    }
  }

  return value
}

// Card component
function CardComponent({ card, faceUp, index }: { card: BlackjackCard; faceUp: boolean; index: number }) {
  const { suit, value } = card

  if (!faceUp) {
    return (
      <div className="absolute w-12 h-18 md:w-16 md:h-24 bg-blue-600 rounded-lg border-2 border-white shadow-lg transform hover:scale-105 transition-transform" style={{ left: `${index * 20}px`, zIndex: index }}>
        <div className="w-full h-full flex items-center justify-center text-white text-xl md:text-2xl font-bold">
          ♠♥♦
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

  return (
    <div className={`absolute w-12 h-18 md:w-16 md:h-24 bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col justify-between p-1 md:p-2 ${color} transform hover:scale-105 transition-transform`} style={{ left: `${index * 20}px`, zIndex: index }}>
      <div className="text-left text-sm md:text-lg font-bold">{value}</div>
      <div className="text-center text-xl md:text-3xl">{suitSymbol}</div>
      <div className="text-right text-sm md:text-lg font-bold transform rotate-180">{value}</div>
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

// Main BlackjackGame component
export default function BlackjackGame() {
  const { balance, updateBalance, canBet } = useContext(UserContext)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [deck, setDeck] = useState<Hand>([])
  const [player, setPlayer] = useState<Player>({
    hands: [[], [], []],
    bets: [0, 0, 0],
    currentHandIndex: 0,
    status: ['betting', 'betting', 'betting'],
    selectedChip: 1,
    previousBet: 0,
    splitCount: [0, 0, 0]
  })
  const [dealerHand, setDealerHand] = useState<Hand>([])
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealerTurn' | 'gameOver'>('betting')
  const [message, setMessage] = useState<string>('')
  const [previousBets, setPreviousBets] = useState<number[]>([0, 0, 0])
  const [dealerStatus, setDealerStatus] = useState<'playing' | 'blackjack' | 'bust' | ''>('')

  // Single game state loading effect
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const savedGame = localStorage.getItem(`blackjack_game_${session.user.id}`);
    if (savedGame) {
      const parsedGame = JSON.parse(savedGame);
      
      // Ask user if they want to restore the game
      if (window.confirm('Would you like to restore your previous game?')) {
        setPlayer(parsedGame.player);
        setDealerHand(parsedGame.dealerHand);
        setDeck(parsedGame.deck);
        setGameState(parsedGame.gameState);
      } else {
        // Clear saved game if user doesn't want to restore
        localStorage.removeItem(`blackjack_game_${session.user.id}`);
      }
    }
  }, [session?.user?.id]);

  // Single game state saving effect
  useEffect(() => {
    if (!session?.user?.id || gameState === 'betting' || gameState === 'gameOver') {
      return;
    }

    const gameStateToSave = {
      player,
      dealerHand,
      deck,
      currentHandIndex: player.currentHandIndex,
      gameState
    };

    localStorage.setItem(
      `blackjack_game_${session.user.id}`,
      JSON.stringify(gameStateToSave)
    );
  }, [gameState, player, dealerHand, deck, session?.user?.id]);

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
  }, [session, status, balance, gameState, updateBalance, router]);

  // Add session keep-alive effect
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

  // Add navigation prevention effects
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState === 'playing' || gameState === 'dealerTurn') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (gameState === 'playing' || gameState === 'dealerTurn') {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [gameState]);

  const resetGame = () => {
    const newDeck = shuffleDeck(createDeck())
    setDeck(newDeck)
    setPlayer({
      hands: [[], [], []],
      bets: [0, 0, 0],
      currentHandIndex: 0,
      status: ['betting', 'betting', 'betting'],
      selectedChip: 1,
      previousBet: 0,
      splitCount: [0, 0, 0]
    })
    setDealerHand([])
    setGameState('betting')
    setMessage('')
    setDealerStatus('')
  }

  const placeBet = (handIndex: number) => {
    const betAmount = player.selectedChip
    if (!canBet(player.bets[handIndex] + betAmount)) {
      setMessage("Insufficient balance for this bet.")
    } else {
      const newPlayer = { ...player }
      newPlayer.bets[handIndex] += betAmount
      newPlayer.previousBet = betAmount
      setPlayer(newPlayer)
      setMessage("")
    }
  }

  const clearBet = (handIndex: number) => {
    const newPlayer = { ...player }
    newPlayer.bets[handIndex] = 0
    setPlayer(newPlayer)
  }

  const undoBet = (handIndex: number) => {
    const newPlayer = { ...player }
    if (newPlayer.bets[handIndex] >= newPlayer.previousBet) {
      newPlayer.bets[handIndex] -= newPlayer.previousBet
      setPlayer(newPlayer)
    }
  }

  const betAll = () => {
    const newPlayer = { ...player }
    const betAmount = player.selectedChip
    newPlayer.hands.forEach((_, index) => {
      if (canBet(newPlayer.bets[index] + betAmount)) {
        newPlayer.bets[index] += betAmount
      }
    })
    newPlayer.previousBet = betAmount
    setPlayer(newPlayer)
  }

  const clearAll = () => {
    const newPlayer = { ...player }
    newPlayer.bets = [0, 0, 0]
    setPlayer(newPlayer)
  }

  const selectChip = (chipValue: number) => {
    setPlayer({ ...player, selectedChip: chipValue })
  }

  const checkForBlackjack = (hand: Hand) => {
    return calculateHandValue(hand) === 21;
  }

  const moveToNextHand = () => {
    const nextHandIndex = player.status.findIndex((status, index) => 
      index > player.currentHandIndex && status === 'playing'
    );
    if (nextHandIndex === -1) {
      setGameState('dealerTurn');
      dealerPlay();
    } else {
      setPlayer(prev => ({ ...prev, currentHandIndex: nextHandIndex }));
    }
  }

  const deal = async () => {
    if (!session?.user) {
      setMessage("Please log in to play");
      router.push('/');
      return;
    }

    const totalBet = player.bets.reduce((sum, bet) => sum + bet, 0)
    if (totalBet > 0) {
      if (!canBet(totalBet)) {
        setMessage("Insufficient balance to place these bets.")
        return
      }

      try {
        // Create and shuffle a new deck before dealing
        const newDeck = shuffleDeck(createDeck())
        setDeck(newDeck)

        // Update balance immediately for UI responsiveness
        updateBalance(balance - totalBet)

        const newPlayer = {
          ...player,
          hands: player.bets.map(bet => bet > 0 ? [] as Hand : [] as Hand),
          status: player.bets.map(bet => bet > 0 ? 'playing' : 'done') as Player['status'],
          splitCount: player.bets.map(() => 0)
        }
        const newDealerHand = [...dealerHand];

        // Deal initial cards
        for (let i = 0; i < 2; i++) {
          newPlayer.hands.forEach((hand, index) => {
            if (newPlayer.status[index] === 'playing') {
              const card = dealCard(newDeck, setDeck)
              if (card) hand.push(card)
            }
          })
          const dealerCard = dealCard(newDeck, setDeck)
          if (dealerCard) newDealerHand.push(dealerCard)
        }

        setDealerHand(newDealerHand)
        setGameState('playing')

        // Check for blackjacks
        newPlayer.hands.forEach((hand, index) => {
          if (newPlayer.status[index] === 'playing' && checkForBlackjack(hand)) {
            newPlayer.status[index] = 'blackjack'
          }
        })

        const firstActiveHandIndex = newPlayer.status.findIndex(status => status === 'playing')
        newPlayer.currentHandIndex = firstActiveHandIndex !== -1 ? firstActiveHandIndex : 0

        setPreviousBets([...newPlayer.bets])
        setPlayer(newPlayer)

        if (newPlayer.status.every(status => status === 'blackjack' || status === 'done')) {
          dealerPlay()
        }

        // Record the game start
        const response = await fetch('/api/games/blackjack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bet: totalBet,
            action: 'deal',
            finalBalance: balance - totalBet
          })
        })

        if (!response.ok) {
          throw new Error('Failed to process game')
        }
      } catch (error) {
        console.error('Game error:', error)
        setMessage("An error occurred while processing the game.")
        // Revert balance on error
        updateBalance(balance)
      }
    } else {
      setMessage("At least one hand must have a bet before dealing.")
    }
  }

  const hit = () => {
    const newDeck = [...deck];
    const card = dealCard(newDeck, setDeck);
    if (card) {
      const newPlayer = { ...player };
      newPlayer.hands[newPlayer.currentHandIndex].push(card);

      const handValue = calculateHandValue(newPlayer.hands[newPlayer.currentHandIndex]);
      if (handValue >= 21) {
        newPlayer.status[newPlayer.currentHandIndex] = handValue > 21 ? 'bust' : 'standing';
        setPlayer(newPlayer);
        moveToNextHand();
      } else {
        setPlayer(newPlayer);
      }
    }
  }

  const stand = () => {
    const newPlayer = { ...player };
    newPlayer.status[newPlayer.currentHandIndex] = 'standing';
    setPlayer(newPlayer);
    moveToNextHand();
  }

  const double = () => {
    const currentBet = player.bets[player.currentHandIndex]
    
    if (!canBet(currentBet)) {
      setMessage("Insufficient balance to double down.")
      return
    }

    updateBalance(balance - currentBet)
    const newPlayer = { ...player }
    newPlayer.bets[newPlayer.currentHandIndex] *= 2

    const newDeck = [...deck]
    const card = dealCard(newDeck, setDeck)
    if (card) {
      newPlayer.hands[newPlayer.currentHandIndex].push(card)
    }

    const handValue = calculateHandValue(newPlayer.hands[newPlayer.currentHandIndex]);
    newPlayer.status[newPlayer.currentHandIndex] = handValue > 21 ? 'bust' : 'standing';
    setPlayer(newPlayer);
    moveToNextHand();
  }

  const split = () => {
    const currentHand = player.hands[player.currentHandIndex];
    const currentBet = player.bets[player.currentHandIndex];

    // Check if split is possible
    if (currentHand.length !== 2) {
      setMessage("Can only split with two cards.");
      return;
    }

    // Compare card values properly, considering face cards
    const getCompareValue = (value: string) => {
      if (['K', 'Q', 'J'].includes(value)) return '10';
      return value;
    };

    const card1Value = getCompareValue(currentHand[0].value);
    const card2Value = getCompareValue(currentHand[1].value);

    if (card1Value !== card2Value) {
      setMessage("Can only split identical cards.");
      return;
    }

    if (!canBet(currentBet)) {
      setMessage("Insufficient balance to split.");
      return;
    }

    if (player.hands.filter(hand => hand.length > 0).length >= 3) {
      setMessage("Maximum number of splits reached.");
      return;
    }

    // Proceed with split
    updateBalance(balance - currentBet);
    
    const newPlayer = { ...player };
    const splitCard = currentHand.pop()!;
    
    // Find next empty hand slot
    const nextEmptyHandIndex = newPlayer.hands.findIndex(hand => hand.length === 0);
    if (nextEmptyHandIndex === -1) {
      setMessage("No more hands available for split.");
      return;
    }

    // Initialize new split hand
    newPlayer.hands[nextEmptyHandIndex] = [splitCard];
    newPlayer.bets[nextEmptyHandIndex] = currentBet;
    newPlayer.status[nextEmptyHandIndex] = 'playing';
    newPlayer.splitCount[player.currentHandIndex]++;
    newPlayer.splitCount[nextEmptyHandIndex] = newPlayer.splitCount[player.currentHandIndex];

    // Deal new cards to both hands
    const newDeck = [...deck];
    const card1 = dealCard(newDeck, setDeck);
    const card2 = dealCard(newDeck, setDeck);

    if (card1) {
      newPlayer.hands[player.currentHandIndex].push(card1);
      
      // Check for blackjack after split
      if (calculateHandValue(newPlayer.hands[player.currentHandIndex]) === 21) {
        newPlayer.status[player.currentHandIndex] = 'blackjack';
      }
    }

    if (card2) {
      newPlayer.hands[nextEmptyHandIndex].push(card2);
      
      // Check for blackjack in new hand
      if (calculateHandValue(newPlayer.hands[nextEmptyHandIndex]) === 21) {
        newPlayer.status[nextEmptyHandIndex] = 'blackjack';
      }
    }

    setDeck(newDeck);
    setPlayer(newPlayer);
    setMessage("Hand split successfully.");

    // Move to next hand if current hand got blackjack
    if (newPlayer.status[player.currentHandIndex] === 'blackjack') {
      moveToNextHand();
    }
  }

  const dealerPlay = async () => {
    try {
      const newDealerHand = [...dealerHand];
      const newDeck = [...deck];

      while (calculateHandValue(newDealerHand) < 17) {
        const card = dealCard(newDeck, setDeck)
        if (card) newDealerHand.push(card)
      }

      setDealerHand(newDealerHand)
      setDeck(newDeck)

      const dealerValue = calculateHandValue(newDealerHand)
      const dealerHasBlackjack = checkForBlackjack(newDealerHand)
      const newPlayer = { ...player }
      let totalWinnings = 0

      // Calculate winnings
      newPlayer.hands.forEach((hand, index) => {
        if (newPlayer.status[index] === 'playing' || newPlayer.status[index] === 'standing' || newPlayer.status[index] === 'blackjack') {
          const handValue = calculateHandValue(hand)
          const playerHasBlackjack = newPlayer.status[index] === 'blackjack'

          if (playerHasBlackjack) {
            if (dealerHasBlackjack) {
              newPlayer.status[index] = 'push'
              totalWinnings += newPlayer.bets[index]
            } else {
              newPlayer.status[index] = 'blackjack'
              totalWinnings += newPlayer.bets[index] * 2.5
            }
          } else if (handValue <= 21) {
            if (dealerValue > 21) {
              newPlayer.status[index] = 'win'
              totalWinnings += newPlayer.bets[index] * 2
            } else if (handValue > dealerValue) {
              newPlayer.status[index] = 'win'
              totalWinnings += newPlayer.bets[index] * 2
            } else if (handValue === dealerValue) {
              newPlayer.status[index] = 'push'
              totalWinnings += newPlayer.bets[index]
            } else {
              newPlayer.status[index] = 'lose'
            }
          }
        }
      })

      // Update balance immediately for UI responsiveness
      const newBalance = balance + totalWinnings
      updateBalance(newBalance)

      // Record the game result
      const totalBet = newPlayer.bets.reduce((sum, bet) => sum + bet, 0);
      const response = await fetch('/api/games/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          bet: totalBet,
          winAmount: totalWinnings,
          finalBalance: newBalance
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process game result')
      }

      setPlayer(newPlayer)
      setGameState('gameOver')
      
      if (dealerValue > 21) {
        setDealerStatus('bust')
      } else if (dealerHasBlackjack) {
        setDealerStatus('blackjack')
      } else {
        setDealerStatus('')
      }
      setMessage(`Round Over! Total winnings: ${totalWinnings.toFixed(2)} TND`)
    } catch (error) {
      console.error('Game error:', error)
      setMessage("An error occurred while processing the game result.")
    }
  }

  const repeatBets = () => {
    if (previousBets.every(bet => bet === 0)) {
      setMessage("No previous bets to repeat.")
      return
    }

    const totalPreviousBet = previousBets.reduce((sum, bet) => sum + bet, 0)
    if (!canBet(totalPreviousBet)) {
      setMessage("Insufficient balance to repeat previous bets.")
      return
    }

    const newPlayer = { ...player }
    newPlayer.bets = [...previousBets]
    setPlayer(newPlayer)
    setMessage("Previous bets repeated.")
    deal() // Automatically deal cards after repeating bets
  }

  const renderHand = (hand: Hand, handIndex: number, isDealer: boolean = false) => {
    const handValue = calculateHandValue(hand)
    const canSplit = hand.length === 2 && 
                     hand[0].value === hand[1].value && 
                     player.splitCount[handIndex] < 2 && 
                     player.hands.filter(h => h.length > 0).length < 3 &&
                     canBet(player.bets[handIndex]);
    const isInitialHand = hand.length === 2;
    const status = player.status[handIndex];

    return (
      <Card className="w-full max-w-sm bg-green-800 border-2 border-yellow-600">
        <CardContent className="p-2 md:p-4">
          <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-4">
            {isDealer ? "Dealer" : `Hand ${handIndex + 1}`}
          </h3>
          <div className="relative h-28 md:h-36 mb-2 md:mb-4">
            <AnimatePresence>
              {hand.map((card, index) => (
                <motion.div
                  key={`${isDealer ? 'dealer' : `player-${handIndex}`}-${card.suit}-${card.value}-${index}`}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CardComponent card={card} faceUp={!isDealer || index !== 1 || gameState === 'gameOver'} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="text-center text-white text-lg font-bold mb-1 md:mb-2">
            {isDealer && gameState !== 'gameOver' && hand.length > 1
              ? `Score: ${calculateHandValue([hand[0]])}+?`
              : `Score: ${handValue}`}
          </div>
          {isDealer && gameState === 'gameOver' && (
            <p className={`text-lg font-bold ${
              dealerStatus === 'blackjack' ? 'text-yellow-300' :
              dealerStatus === 'bust' ? 'text-red-500' :
              'text-blue-300'
            }`}>
              {dealerStatus.charAt(0).toUpperCase() + dealerStatus.slice(1)}
            </p>
          )}
          {!isDealer && (
            <>
              <p className="text-sm md:text-lg text-yellow-400 mb-2 md:mb-4">Bet: ${player.bets[handIndex]}</p>
              {gameState === 'betting' && (
                <div className="flex space-x-1 md:space-x-2 justify-center">
                  <Button onClick={() => clearBet(handIndex)} variant="destructive" size="sm" className="text-xs md:text-sm px-2 py-1"><RefreshCcw className="w-3 h-3 md:w-4 md:h-4 mr-1" />Clear</Button>
                  <Button onClick={() => placeBet(handIndex)} variant="secondary" size="sm" className="text-xs md:text-sm px-2 py-1"><Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />Bet</Button>
                  <Button onClick={() => undoBet(handIndex)} variant="outline" size="sm" className="text-xs md:text-sm px-2 py-1"><Minus className="w-3 h-3 md:w-4 md:h-4 mr-1" />Undo</Button>
                </div>
              )}
              {gameState === 'playing' && handIndex === player.currentHandIndex && status === 'playing' && (
                <div className="flex space-x-1 md:space-x-2 justify-center mt-2 md:mt-4">
                  <Button onClick={hit} variant="secondary" size="sm" className="text-xs md:text-sm"><Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />Hit</Button>
                  <Button onClick={stand} variant="outline" size="sm" className="text-xs md:text-sm"><HandMetal className="w-3 h-3 md:w-4 md:h-4 mr-1" />Stand</Button>
                  {isInitialHand && <Button onClick={double} variant="default" size="sm" className="text-xs md:text-sm"><Coins className="w-3 h-3 md:w-4 md:h-4 mr-1" />Double</Button>}
                  {canSplit && <Button onClick={split} variant="default" size="sm" className="text-xs md:text-sm"><SplitSquareVertical className="w-3 h-3 md:w-4 md:h-4 mr-1" />Split</Button>}
                </div>
              )}
            </>
          )}
          {status === 'bust' && <p className="text-red-500 font-bold mt-2">Bust!</p>}
          {status === 'blackjack' && <p className="text-yellow-300 font-bold mt-2">Blackjack!</p>}
          {status === 'win' && <p className="text-green-400 font-bold mt-2">Win!</p>}
          {status === 'lose' && <p className="text-red-500 font-bold mt-2">Lose</p>}
          {status === 'push' && <p className="text-blue-300 font-bold mt-2">Push</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-green-800 border-2 border-yellow-600 mb-4 md:mb-6">
          <CardContent className="p-2 md:p-4">
            <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-1 md:mb-2">Blackjack</h1>
            <p className="text-center text-sm md:text-lg text-yellow-400 font-semibold">
              BLACKJACK PAYS 3 TO 2
            </p>
          </CardContent>
        </Card>
        
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          {/* Dealer's area */}
          <div className="md:col-span-3">
            {renderHand(dealerHand, -1, true)}
          </div>

          {/* Player's hands */}
          {player.hands.map((hand, index) => (
            <div key={index} className={`${index === player.currentHandIndex && gameState === 'playing' ? 'ring-4 ring-yellow-400 rounded-lg' : ''}`}>
              {renderHand(hand, index, false)}
            </div>
          ))}
        </div>

        {/* Game controls and betting chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-4 md:mt-6">
          <div className="flex-grow">
            <ChipStack onChipClick={(amount) => selectChip(amount)} selectedChip={player.selectedChip} />
          </div>
          <div className="flex flex-wrap justify-end gap-2 md:gap-4">
            {gameState === 'betting' && (
              <>
                <Button onClick={deal} disabled={player.bets.every(bet => bet === 0)} size="sm" className="text-xs md:text-sm flex-grow md:flex-grow-0 md:w-1/4">
                  <Play className="w-3 h-3 md:w-4 md:h-4 mr-1" />Deal
                </Button>
                <Button onClick={betAll} variant="secondary" size="sm" className="text-xs md:text-sm">
                  <Coins className="w-3 h-3 md:w-4 md:h-4 mr-1" />Bet All
                </Button>
                <Button onClick={clearAll} variant="destructive" size="sm" className="text-xs md:text-sm">
                  <RefreshCcw className="w-3 h-3 md:w-4 md:h-4 mr-1" />Clear All
                </Button>
              </>
            )}
            {gameState === 'gameOver' && (
              <>
                <Button onClick={resetGame} variant="secondary" size="sm" className="text-xs md:text-sm">
                  <RefreshCcw className="w-3 h-3 md:w-4 md:h-4 mr-1" />New Round
                </Button>
                <Button onClick={repeatBets} variant="secondary" size="sm" className="text-xs md:text-sm">
                  <Repeat className="w-3 h-3 md:w-4 md:h-4 mr-1" />Repeat
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
              <p>Total Bet: ${player.bets.reduce((sum, bet) => sum + bet, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
